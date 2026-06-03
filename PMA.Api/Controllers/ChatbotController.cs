using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/chatbot")]
[Authorize(Roles = "Secretaire")]
public class ChatbotController(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    IUnitOfWork uow) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    private const string BaseSystemPrompt =
        "Tu es un assistant médical intelligent (propulsé par Groq/Llama) intégré dans le système de gestion PMA (Procréation Médicalement Assistée) d'une clinique. " +
        "Tu aides la secrétaire médicale en répondant à ses questions en utilisant les DONNÉES RÉELLES du système qui te sont fournies dans le contexte.\n\n" +
        "Tu peux répondre sur :\n" +
        "- Les dossiers patients (nom, type de dossier, acte PMA prévu, coordonnées)\n" +
        "- Les rendez-vous (dates, motifs, statuts)\n" +
        "- Les cycles PMA (phases, étapes, résultats β-hCG)\n" +
        "- L'emplacement précis des éléments biologiques en cryoconservation (bonbonne, canister, position)\n" +
        "- Les éléments biologiques par patient (type, code-barres)\n\n" +
        "Règles importantes :\n" +
        "- Utilise TOUJOURS les données réelles fournies, ne les invente jamais\n" +
        "- Si une information n'est pas dans les données, dis-le clairement\n" +
        "- Réponds en français, de façon professionnelle et concise\n" +
        "- Pour les recherches par nom, fais une correspondance approximative (insensible à la casse)\n" +
        "- Les données patients sont strictement confidentielles";

    // ── POST /api/chatbot/chat ────────────────────────────────────────────────
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatbotMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Le message est obligatoire.");

        var context = await BuildDataContextAsync();
        var systemPrompt = BaseSystemPrompt + "\n\n" + context;

        // 1. Grok xAI
        var answer = await CallGrokAsync(request.Message, request.History ?? [], systemPrompt);
        if (answer is not null)
        {
            // Si c'est un message d'erreur Grok (commence par [Erreur), on essaie Python avant de l'afficher
            if (!answer.StartsWith("[Erreur"))
                return Ok(new ChatbotResponse { Answer = answer, Sources = [] });

            // 2. Python proxy (si Grok a échoué)
            var pythonAnswer = await TryPythonProxyAsync(request.Message);
            if (pythonAnswer is not null)
                return Ok(new ChatbotResponse { Answer = pythonAnswer, Sources = [] });

            // Retourner le vrai message d'erreur Grok pour diagnostic
            return Ok(new ChatbotResponse { Answer = answer, Sources = [] });
        }

        // 3. Fallback local (clé vide)
        return Ok(new ChatbotResponse
        {
            Answer = BuildLocalResponse(request.Message),
            Sources = []
        });
    }

    // ── POST /api/chatbot/summarize-patient ───────────────────────────────────
    [HttpPost("summarize-patient")]
    public async Task<IActionResult> SummarizePatient([FromBody] PatientSummaryRequest req)
    {
        var context = await BuildDataContextAsync();
        var systemPrompt = BaseSystemPrompt + "\n\n" + context;
        var prompt = $"Génère un résumé structuré et complet du dossier patient : {req.PatientPrenom} {req.PatientNom} (N° {req.NumDossier}). " +
                     "Inclus : état général, rendez-vous, cycles PMA, éléments biologiques conservés et leurs emplacements. Sois précis et professionnel.";

        var answer = await CallGrokAsync(prompt, [], systemPrompt);
        if (answer is not null)
            return Ok(new ChatbotResponse { Answer = answer, Sources = [] });

        return Ok(new ChatbotResponse { Answer = BuildFallbackSummary(req), Sources = [] });
    }

    // ── GET /api/chatbot/health ───────────────────────────────────────────────
    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> Health()
    {
        var grokKey = config["Grok:ApiKey"] ?? "";
        if (!string.IsNullOrWhiteSpace(grokKey))
            return Ok(new { status = "ok", engine = "grok" });

        var baseUrl = config.GetSection("PmaChatbot")["BaseUrl"] ?? "http://127.0.0.1:8000";
        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(5);
        try
        {
            var res = await client.GetAsync($"{baseUrl}/health");
            if (res.IsSuccessStatusCode)
                return Ok(new { status = "ok", engine = "python" });
        }
        catch { }

        return Ok(new { status = "ok", engine = "local" });
    }

    // ── Contexte données réelles ──────────────────────────────────────────────
    private async Task<string> BuildDataContextAsync()
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== DONNÉES RÉELLES DU SYSTÈME PMA ===");
        sb.AppendLine();

        // Patients
        var patients  = await uow.Patients.ListAsync();
        var patMap    = patients.ToDictionary(p => p.Id);

        sb.AppendLine($"### PATIENTS ({patients.Count}) ###");
        foreach (var p in patients)
        {
            var conjoint = !string.IsNullOrWhiteSpace(p.FemmeNom)
                ? $" | Conjointe: {p.FemmePrenom} {p.FemmeNom}" : "";
            sb.AppendLine($"- ID:{p.Id} | {p.Nom} {p.Prenom} | Dossier: {p.NumDossier} | Type: {p.TypeDossier ?? "N/A"}" +
                          $" | Acte: {p.TypeActePma ?? "N/A"} | Tél: {p.Telephone ?? "N/A"}{conjoint}");
        }
        sb.AppendLine();

        // Rendez-vous
        var rdvs = await uow.RendezVous.ListAsync();
        sb.AppendLine($"### RENDEZ-VOUS ({rdvs.Count}) ###");
        foreach (var r in rdvs.OrderByDescending(x => x.DateHeure).Take(100))
        {
            patMap.TryGetValue(r.PatientId, out var rp);
            var patName = rp is not null ? $"{rp.Nom} {rp.Prenom}" : $"Patient#{r.PatientId}";
            sb.AppendLine($"- {patName} | {r.DateHeure:dd/MM/yyyy HH:mm} | Motif: {r.Motif} | Statut: {r.Statut}");
        }
        sb.AppendLine();

        // Cycles PMA
        var cycles = await uow.CyclesPma.ListAsync();
        sb.AppendLine($"### CYCLES PMA ({cycles.Count}) ###");
        foreach (var c in cycles)
        {
            patMap.TryGetValue(c.PatientId, out var cp);
            var patName = cp is not null ? $"{cp.Nom} {cp.Prenom}" : $"Patient#{c.PatientId}";
            var res = c.ResultatTestGrossesse is { Length: > 0 } r2 ? $" | Résultat β-hCG: {r2}" : "";
            sb.AppendLine($"- {patName} | Phase: {c.Phase} | Étape: {c.EtapeCourante} | Statut: {c.StatutCycle} | Début: {c.DateDebut:dd/MM/yyyy}{res}");
        }
        sb.AppendLine();

        // Éléments biologiques (cryoconservation - PailleTubes avec emplacement précis)
        var pailles    = await uow.PailleTubes.ListAsync();
        var canisters  = await uow.Canisters.ListAsync();
        var bonbonnes  = await uow.Bonbonnes.ListAsync();
        var canMap     = canisters.ToDictionary(c => c.Id);
        var bonMap     = bonbonnes.ToDictionary(b => b.Id);

        sb.AppendLine($"### ÉLÉMENTS BIOLOGIQUES EN CRYOCONSERVATION ({pailles.Count}) ###");
        foreach (var p2 in pailles)
        {
            patMap.TryGetValue(p2.PatientId ?? -1, out var pp);
            var patName = pp is not null ? $"{pp.Nom} {pp.Prenom}" : "Patient inconnu";
            canMap.TryGetValue(p2.CanisterId, out var can);
            var bonNom = (can is not null && bonMap.TryGetValue(can.BonbonneId, out var bon))
                ? $"{bon.Code} (type: {bon.TypeStockage}, temp: {bon.Temperature})" : "N/A";
            var canNum = can?.Numero.ToString() ?? "N/A";
            sb.AppendLine($"- {patName} | Type: {p2.TypeContenu} | Code-barres: {p2.CodeBarre} | " +
                          $"Bonbonne: {bonNom} | Canister N°{canNum} | Position: {p2.Position} | Visotube: {p2.CouleurVisotube ?? "N/A"}");
        }
        sb.AppendLine();

        // Éléments biologiques (table ElementBiologique)
        var elems = await uow.ElementsBiologiques.ListAsync();
        if (elems.Count > 0)
        {
            sb.AppendLine($"### ÉLÉMENTS BIOLOGIQUES - ANALYSES ({elems.Count}) ###");
            foreach (var e in elems)
            {
                patMap.TryGetValue(e.PatientId, out var ep);
                var patName = ep is not null ? $"{ep.Nom} {ep.Prenom}" : $"Patient#{e.PatientId}";
                sb.AppendLine($"- {patName} | Type: {e.TypeElement} | N°tube: {e.NumeroTube ?? "N/A"} | Code-barres: {e.CodeBarre ?? "N/A"} | Date: {e.DateCreation:dd/MM/yyyy}");
            }
            sb.AppendLine();
        }

        // Actes PMA
        var actes = await uow.ActesPma.ListAsync();
        if (actes.Count > 0)
        {
            sb.AppendLine($"### ACTES PMA ({actes.Count}) ###");
            foreach (var a in actes)
            {
                patMap.TryGetValue(a.PatientId, out var ap);
                var patName = ap is not null ? $"{ap.Nom} {ap.Prenom}" : $"Patient#{a.PatientId}";
                sb.AppendLine($"- {patName} | {a.Libelle} ({a.TypeActe}) | Statut: {a.StatutRealisation}");
            }
        }

        return sb.ToString();
    }

    // ── Grok xAI ─────────────────────────────────────────────────────────────
    private async Task<string?> CallGrokAsync(
        string userMessage,
        IEnumerable<ChatHistoryItem> history,
        string systemPrompt)
    {
        var apiKey = config["Grok:ApiKey"] ?? "";
        if (string.IsNullOrWhiteSpace(apiKey)) return null;

        var baseUrl = config["Grok:BaseUrl"] ?? "https://api.x.ai/v1";
        var model   = config["Grok:Model"]   ?? "grok-beta";

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };
        foreach (var h in history)
            messages.Add(new { role = h.Role, content = h.Content });
        messages.Add(new { role = "user", content = userMessage });

        var payload = new { model, messages, max_tokens = 1500, temperature = 0.4 };

        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(60);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var json    = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try { response = await client.PostAsync($"{baseUrl}/chat/completions", content); }
        catch (Exception ex) { return $"[Erreur réseau Grok : {ex.Message}]"; }

        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return $"[Erreur Grok {(int)response.StatusCode} : {body}]";

        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()?.Trim();
        }
        catch { return $"[Réponse Grok invalide : {body[..Math.Min(200, body.Length)]}]"; }
    }

    // ── Python proxy ──────────────────────────────────────────────────────────
    private async Task<string?> TryPythonProxyAsync(string message)
    {
        var userId  = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0";
        var section = config.GetSection("PmaChatbot");
        var baseUrl = section["BaseUrl"] ?? "http://127.0.0.1:8000";
        var apiKey  = section["ApiKey"]  ?? "";

        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        var payload = new { user_id = userId, message = message.Trim() };
        var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/internal/chat")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOpts), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("X-Api-Key", apiKey);

        try
        {
            var response = await client.SendAsync(req);
            if (!response.IsSuccessStatusCode) return null;
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("answer", out var ans) ? ans.GetString()?.Trim() : null;
        }
        catch { return null; }
    }

    // ── Fallback local ────────────────────────────────────────────────────────
    private static string BuildLocalResponse(string message)
    {
        var m = message.ToLowerInvariant();
        if (m.Contains("résumé") || m.Contains("resume") || m.Contains("dossier"))
            return "Je suis en mode local (clé Grok non configurée). Veuillez configurer votre clé API Grok dans appsettings.json pour obtenir des réponses avec les vraies données du système.";
        if (m.Contains("bonjour") || m.Contains("salut"))
            return "Bonjour ! Je suis l'assistant PMA. Configurez votre clé Grok pour que je puisse répondre sur les patients, cycles, rendez-vous et emplacements des éléments biologiques.";
        return "Service Grok non configuré. Ajoutez votre clé API dans appsettings.json section \"Grok:ApiKey\" pour activer les réponses intelligentes avec les données réelles.";
    }

    private static string BuildFallbackSummary(PatientSummaryRequest req)
    {
        return $"Résumé local — {req.PatientPrenom} {req.PatientNom} (N° {req.NumDossier}). " +
               "Configurez Grok pour un résumé complet avec les données réelles.";
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public class ChatbotMessageRequest
{
    public string Message { get; set; } = "";
    public List<ChatHistoryItem>? History { get; set; }
}

public class ChatHistoryItem
{
    public string Role    { get; set; } = "user";
    public string Content { get; set; } = "";
}

public class ChatbotResponse
{
    public string Answer { get; set; } = "";
    public List<object> Sources { get; set; } = [];
}

public class PatientSummaryRequest
{
    public string PatientNom    { get; set; } = "";
    public string PatientPrenom { get; set; } = "";
    public string NumDossier    { get; set; } = "";
    public string? TypeDossier  { get; set; }
    public string? DateNaissance{ get; set; }
    public string? Telephone    { get; set; }
    public string? FemmeNom     { get; set; }
    public string? FemmePrenom  { get; set; }
    public string? TypeActePma  { get; set; }
    public List<RdvDto>?   RendezVous { get; set; }
    public List<CycleDto>? Cycles     { get; set; }
}

public class RdvDto
{
    public DateTime DateHeure { get; set; }
    public string Motif  { get; set; } = "";
    public string Statut { get; set; } = "";
}

public class CycleDto
{
    public string Phase          { get; set; } = "";
    public string EtapeCourante  { get; set; } = "";
    public string StatutCycle    { get; set; } = "";
    public DateTime DateDebut    { get; set; }
    public string? ResultatTestGrossesse { get; set; }
}
