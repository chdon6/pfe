using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PMA.Api.Entites;
using PMA.Api.Hubs;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/cyclespma")]
public class CyclesPmaController(IUnitOfWork uow, IHubContext<CycleHub> hub) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CyclePmaDto>>> GetAll()
    {
        var list = await uow.CyclesPma.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CyclePmaDto>> GetById(int id)
    {
        var c = await uow.CyclesPma.GetByIdAsync(id);
        return c is null ? NotFound() : Ok(Map(c));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CyclePmaCreateDto dto)
    {
        if (dto.PatientId <= 0)
            return BadRequest("Identifiant patient invalide.");
        if (string.IsNullOrWhiteSpace(dto.Phase))
            return BadRequest("La phase du cycle PMA est obligatoire. Sélectionnez une phase avant l'enregistrement.");
        var patient = await uow.Patients.GetByIdAsync(dto.PatientId);
        if (patient is null)
            return BadRequest("Patient introuvable. Impossible de créer un cycle PMA.");
        var rdvsPatient = await uow.RendezVous.ListAsync(r => r.PatientId == dto.PatientId);
        var rdvActifs = rdvsPatient.Where(r =>
            !string.Equals(r.Statut?.Trim(), "annule", StringComparison.OrdinalIgnoreCase)).ToList();
        if (rdvActifs.Count == 0)
            return BadRequest(
                "Un cycle PMA nécessite au moins un rendez-vous enregistré pour ce patient. Planifiez d'abord un rendez-vous (accueil / agenda).");

        var now = DateTime.UtcNow;
        var e = new CyclePma
        {
            Phase = dto.Phase.Trim(),
            PatientId = dto.PatientId,
            ProtocoleId = dto.ProtocoleId,
            StatutCycle = "brouillon",
            EtapeCourante = "initialisation",
            DateDebut = now.Date,
            DerniereMiseAJour = now
        };
        await uow.CyclesPma.AddAsync(e);
        try
        {
            await uow.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsPhaseNotNullViolation(ex))
        {
            return BadRequest("La phase du cycle PMA est obligatoire. Merci de choisir une phase valide.");
        }

        await uow.CycleEtapesHistorique.AddAsync(new CycleEtapeHistorique
        {
            Etape = e.Phase,
            Statut = "en_cours",
            DateEtape = now,
            Observation = "Ouverture du cycle PMA",
            CyclePmaId = e.Id,
            UserId = null
        });
        e.EtapeCourante = e.Phase;
        e.StatutCycle = "en_cours";
        await uow.CyclesPma.UpdateAsync(e);
        await uow.SaveChangesAsync();

        await NotifyCycleChanged(e.Id);
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    private static bool IsPhaseNotNullViolation(DbUpdateException ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("ORA-01400", StringComparison.OrdinalIgnoreCase)
               && msg.Contains("CYCLES_PMA", StringComparison.OrdinalIgnoreCase)
               && msg.Contains("PHASE", StringComparison.OrdinalIgnoreCase);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.CyclesPma.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.CyclesPma.DeleteAsync(e);
        await uow.SaveChangesAsync();
        await hub.Clients.Group(CycleHub.CyclesListGroup).SendAsync("CycleListChanged");
        return NoContent();
    }

    /// <summary>Tous les jalons enregistrés (agenda global, calendriers).</summary>
    [HttpGet("historiques")]
    public async Task<ActionResult<IReadOnlyList<CycleEtapeHistoriqueDto>>> GetAllHistoriques()
    {
        await EnsureHistoriqueFromCyclesAsync();
        var list = await uow.CycleEtapesHistorique.ListAsync();
        return Ok(list.OrderBy(h => h.DateEtape).Select(MapHistorique).ToList());
    }

    [HttpGet("{id:int}/historique")]
    public async Task<ActionResult<IReadOnlyList<CycleEtapeHistoriqueDto>>> GetHistorique(int id)
    {
        var cycle = await uow.CyclesPma.GetByIdAsync(id);
        if (cycle is null) return NotFound();
        await EnsureHistoriqueForCycleAsync(cycle);
        var list = await uow.CycleEtapesHistorique.ListAsync(h => h.CyclePmaId == id);
        return Ok(list.OrderBy(h => h.DateEtape).Select(MapHistorique).ToList());
    }

    [HttpPost("{id:int}/avancer")]
    public async Task<IActionResult> Avancer(int id, [FromBody] AvancerEtapeDto body)
    {
        var cycle = await uow.CyclesPma.GetByIdAsync(id);
        if (cycle is null) return NotFound();
        var now = DateTime.UtcNow;
        await uow.CycleEtapesHistorique.AddAsync(new CycleEtapeHistorique
        {
            Etape = body.Etape ?? "",
            Statut = "termine",
            DateEtape = now,
            Observation = body.Observation,
            CyclePmaId = id,
            UserId = null
        });
        if (!string.IsNullOrWhiteSpace(body.Etape))
            cycle.Phase = body.Etape.Trim();
        cycle.EtapeCourante = body.Etape ?? cycle.EtapeCourante;
        cycle.DerniereMiseAJour = now;
        cycle.StatutCycle = "en_cours";
        await uow.CyclesPma.UpdateAsync(cycle);
        await uow.SaveChangesAsync();
        await NotifyCycleChanged(id);
        return NoContent();
    }

    [HttpPatch("{id:int}/resultat-test")]
    public async Task<IActionResult> PatchResultatTest(int id, [FromBody] ResultatTestPatchDto body)
    {
        var c = await uow.CyclesPma.GetByIdAsync(id);
        if (c is null) return NotFound();
        var v = (body.ResultatTestGrossesse ?? "").Trim().ToLowerInvariant();
        if (v is not ("positif" or "negatif" or "en_attente"))
            return BadRequest("resultatTestGrossesse doit être positif, negatif ou en_attente.");
        c.ResultatTestGrossesse = v;
        c.ResultatTestSignePar = null;
        c.ResultatTestSigneLe = null;
        c.DerniereMiseAJour = DateTime.UtcNow;
        await uow.CyclesPma.UpdateAsync(c);
        await uow.SaveChangesAsync();
        await NotifyCycleChanged(id);
        return NoContent();
    }

    /// <summary>Signature biologiste après saisie d'un résultat positif ou négatif.</summary>
    [HttpPost("{id:int}/signature-resultat-test")]
    public async Task<IActionResult> SignerResultatTest(int id, [FromBody] SignerResultatTestDto body)
    {
        var c = await uow.CyclesPma.GetByIdAsync(id);
        if (c is null) return NotFound();
        var r = (c.ResultatTestGrossesse ?? "").Trim().ToLowerInvariant();
        if (r is not ("positif" or "negatif"))
            return BadRequest("Le résultat doit être positif ou négatif avant signature.");
        var nom = (body.Signataire ?? "").Trim();
        if (nom.Length < 2)
            return BadRequest("Signataire obligatoire (nom du biologiste).");
        c.ResultatTestSignePar = nom;
        c.ResultatTestSigneLe = DateTime.UtcNow;
        c.DerniereMiseAJour = DateTime.UtcNow;
        await uow.CyclesPma.UpdateAsync(c);
        await uow.SaveChangesAsync();
        await NotifyCycleChanged(id);
        return NoContent();
    }

    private async Task NotifyCycleChanged(int cycleId)
    {
        await hub.Clients.Group(CycleHub.GroupName(cycleId)).SendAsync("CycleUpdated", cycleId);
        await hub.Clients.Group(CycleHub.CyclesListGroup).SendAsync("CycleListChanged");
    }

    /// <summary>Crée un jalon initial en base pour les cycles existants sans historique.</summary>
    private async Task EnsureHistoriqueFromCyclesAsync()
    {
        var cycles = await uow.CyclesPma.ListAsync();
        var changed = false;
        foreach (var c in cycles)
        {
            var existing = await uow.CycleEtapesHistorique.ListAsync(h => h.CyclePmaId == c.Id);
            if (existing.Count > 0) continue;
            await uow.CycleEtapesHistorique.AddAsync(BuildHistoriqueFromCycle(c));
            changed = true;
        }
        if (changed)
            await uow.SaveChangesAsync();
    }

    private async Task EnsureHistoriqueForCycleAsync(CyclePma cycle)
    {
        var existing = await uow.CycleEtapesHistorique.ListAsync(h => h.CyclePmaId == cycle.Id);
        if (existing.Count > 0) return;
        await uow.CycleEtapesHistorique.AddAsync(BuildHistoriqueFromCycle(cycle));
        await uow.SaveChangesAsync();
    }

    private static CycleEtapeHistorique BuildHistoriqueFromCycle(CyclePma cycle)
    {
        var when = cycle.DerniereMiseAJour != default ? cycle.DerniereMiseAJour : cycle.DateDebut;
        if (when == default)
            when = DateTime.UtcNow;
        var statut = string.Equals(cycle.StatutCycle, "termine", StringComparison.OrdinalIgnoreCase)
            ? "termine"
            : "en_cours";
        return new CycleEtapeHistorique
        {
            Etape = string.IsNullOrWhiteSpace(cycle.Phase) ? "Cycle PMA" : cycle.Phase.Trim(),
            Statut = statut,
            DateEtape = when,
            Observation = "Synchronisé depuis le dossier cycle",
            CyclePmaId = cycle.Id,
            UserId = null
        };
    }

    private static CycleEtapeHistoriqueDto MapHistorique(CycleEtapeHistorique h) => new()
    {
        Id = h.Id,
        Etape = h.Etape,
        Statut = h.Statut,
        DateEtape = h.DateEtape,
        Observation = h.Observation,
        CyclePmaId = h.CyclePmaId,
        UserId = h.UserId
    };

    private static CyclePmaDto Map(CyclePma c) => new()
    {
        Id = c.Id,
        Phase = c.Phase,
        StatutCycle = c.StatutCycle,
        EtapeCourante = c.EtapeCourante,
        DateDebut = c.DateDebut,
        DateFin = c.DateFin,
        DerniereMiseAJour = c.DerniereMiseAJour,
        PatientId = c.PatientId,
        ProtocoleId = c.ProtocoleId,
        ResultatTestGrossesse = c.ResultatTestGrossesse,
        ResultatTestSignePar = c.ResultatTestSignePar,
        ResultatTestSigneLe = c.ResultatTestSigneLe
    };
}

public class CyclePmaDto
{
    public int Id { get; set; }
    public string Phase { get; set; } = "";
    public string StatutCycle { get; set; } = "";
    public string EtapeCourante { get; set; } = "";
    public DateTime DateDebut { get; set; }
    public DateTime? DateFin { get; set; }
    public DateTime DerniereMiseAJour { get; set; }
    public int PatientId { get; set; }
    public int? ProtocoleId { get; set; }
    public string? ResultatTestGrossesse { get; set; }
    public string? ResultatTestSignePar { get; set; }
    public DateTime? ResultatTestSigneLe { get; set; }
}

public class ResultatTestPatchDto
{
    public string? ResultatTestGrossesse { get; set; }
}

public class SignerResultatTestDto
{
    public string? Signataire { get; set; }
}

public class CyclePmaCreateDto
{
    public string? Phase { get; set; }
    public int PatientId { get; set; }
    public int? ProtocoleId { get; set; }
}

public class CycleEtapeHistoriqueDto
{
    public int Id { get; set; }
    public string Etape { get; set; } = "";
    public string Statut { get; set; } = "";
    public DateTime DateEtape { get; set; }
    public string? Observation { get; set; }
    public int CyclePmaId { get; set; }
    public int? UserId { get; set; }
}

public class AvancerEtapeDto
{
    public string Etape { get; set; } = "";
    public string? Observation { get; set; }
}
