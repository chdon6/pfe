using System.Text;
using PMA.Api.Interfaces;

namespace PMA.Api.Services;

public class AiAssistantService : IAiAssistantService
{
    public IReadOnlyList<string> SuggestRendezVousMotifs(string? patientDisplayName, DateTime? dateHeure, string? currentMotif)
    {
        var label = string.IsNullOrWhiteSpace(patientDisplayName) ? "patient" : patientDisplayName.Trim();
        var partOfDay = dateHeure.HasValue && dateHeure.Value.Hour >= 14 ? "suivi de l'apres-midi" : "suivi du matin";
        var seed = string.IsNullOrWhiteSpace(currentMotif) ? "consultation PMA" : currentMotif.Trim();

        return
        [
            $"{seed} - verification des examens et orientation",
            $"Entretien administratif avec {label} ({partOfDay})",
            "Point d'avancement du dossier et preparation des prochaines etapes"
        ];
    }

    public string ReformulateAdministrativeNote(string note)
    {
        var clean = NormalizeText(note);
        if (clean.Length == 0) return "";

        if (!clean.EndsWith(".", StringComparison.Ordinal))
            clean += ".";

        return $"Note administrative reformulee: {clean}";
    }

    public string SummarizePatientTimeline(PatientTimelineContext context)
    {
        var sb = new StringBuilder();
        var patient = string.IsNullOrWhiteSpace(context.PatientDisplayName) ? "Patient" : context.PatientDisplayName.Trim();
        var dossier = string.IsNullOrWhiteSpace(context.DossierType) ? "non precise" : context.DossierType.Trim();

        sb.Append($"{patient} - dossier {dossier}. ");

        if (context.RendezVous.Count == 0)
        {
            sb.Append("Aucun rendez-vous enregistre. ");
        }
        else
        {
            var ordered = context.RendezVous.OrderBy(r => r.DateHeure).ToList();
            var next = ordered.FirstOrDefault(r => r.DateHeure >= DateTime.Now);
            sb.Append($"{ordered.Count} rendez-vous au total");
            if (next is not null)
                sb.Append($", prochain le {next.DateHeure:dd/MM/yyyy HH:mm}");
            sb.Append(". ");
        }

        if (context.Cycles.Count > 0)
        {
            var actifs = context.Cycles.Count(c =>
                !string.Equals(c.StatutCycle, "termine", StringComparison.OrdinalIgnoreCase));
            sb.Append($"{context.Cycles.Count} cycle(s) PMA, dont {actifs} actif(s). ");
        }

        if (context.Actes.Count > 0)
        {
            var aFaire = context.Actes.Count(a =>
                string.Equals(a.StatutRealisation, "a_faire", StringComparison.OrdinalIgnoreCase));
            sb.Append($"{context.Actes.Count} acte(s) prescrit(s), {aFaire} encore a realiser.");
        }

        return sb.ToString().Trim();
    }

    private static string NormalizeText(string value)
    {
        var tokens = value
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (tokens.Length == 0) return string.Empty;

        var joined = string.Join(" ", tokens);
        if (joined.Length == 1) return joined.ToUpperInvariant();
        return char.ToUpperInvariant(joined[0]) + joined[1..];
    }
}
