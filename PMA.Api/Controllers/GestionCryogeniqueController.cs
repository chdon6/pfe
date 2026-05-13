using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

// ─── Capteurs Température ───

[ApiController]
[Route("api/capteurs-temperature")]
public class CapteursTemperatureController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CapteurTemperatureDto>>> GetAll()
    {
        var list = await uow.CapteursTemperature.ListAsync();
        var bonbonnes = await uow.Bonbonnes.ListAsync();
        return Ok(list.Select(c =>
        {
            var b = bonbonnes.FirstOrDefault(x => x.Id == c.BonbonneId);
            return new CapteurTemperatureDto
            {
                Id = c.Id,
                Nom = c.Nom,
                BonbonneId = c.BonbonneId,
                BonbonneCode = b?.Code ?? "",
                TemperatureActuelle = c.TemperatureActuelle,
                TemperatureCible = c.TemperatureCible,
                SeuilAlerte = c.SeuilAlerte,
                Statut = c.Statut,
                DerniereMaj = c.DerniereMaj
            };
        }).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CapteurTemperatureDto>> GetById(int id)
    {
        var c = await uow.CapteursTemperature.GetByIdAsync(id);
        if (c is null) return NotFound();
        var b = await uow.Bonbonnes.GetByIdAsync(c.BonbonneId);
        return Ok(new CapteurTemperatureDto
        {
            Id = c.Id, Nom = c.Nom, BonbonneId = c.BonbonneId,
            BonbonneCode = b?.Code ?? "",
            TemperatureActuelle = c.TemperatureActuelle,
            TemperatureCible = c.TemperatureCible,
            SeuilAlerte = c.SeuilAlerte, Statut = c.Statut, DerniereMaj = c.DerniereMaj
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CapteurTemperatureDto dto)
    {
        var e = new CapteurTemperature
        {
            Nom = dto.Nom, BonbonneId = dto.BonbonneId,
            TemperatureActuelle = dto.TemperatureActuelle,
            TemperatureCible = dto.TemperatureCible,
            SeuilAlerte = dto.SeuilAlerte, Statut = dto.Statut ?? "normal",
            DerniereMaj = DateTime.UtcNow
        };
        await uow.CapteursTemperature.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CapteurTemperatureDto dto)
    {
        var e = await uow.CapteursTemperature.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.Nom = dto.Nom;
        e.TemperatureActuelle = dto.TemperatureActuelle;
        e.TemperatureCible = dto.TemperatureCible;
        e.SeuilAlerte = dto.SeuilAlerte;
        e.Statut = dto.Statut ?? "normal";
        e.DerniereMaj = DateTime.UtcNow;
        await uow.CapteursTemperature.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:int}/temperature")]
    public async Task<IActionResult> UpdateTemperature(int id, [FromBody] UpdateTemperatureDto dto)
    {
        var e = await uow.CapteursTemperature.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.TemperatureActuelle = dto.Valeur;
        var diff = Math.Abs(dto.Valeur - e.TemperatureCible);
        e.Statut = diff > e.SeuilAlerte ? "critical" : diff > e.SeuilAlerte * 0.6 ? "warning" : "normal";
        e.DerniereMaj = DateTime.UtcNow;
        await uow.CapteursTemperature.UpdateAsync(e);

        var hist = new HistoriqueTemperature
        {
            CapteurTemperatureId = id, Valeur = dto.Valeur, DateMesure = DateTime.UtcNow
        };
        await uow.HistoriquesTemperature.AddAsync(hist);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.CapteursTemperature.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.CapteursTemperature.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

// ─── Historique Température ───

[ApiController]
[Route("api/historiques-temperature")]
public class HistoriquesTemperatureController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet("{capteurId:int}")]
    public async Task<ActionResult<IReadOnlyList<HistoriqueTemperatureDto>>> GetByCapteur(int capteurId)
    {
        var list = await uow.HistoriquesTemperature.ListAsync(h => h.CapteurTemperatureId == capteurId);
        return Ok(list.OrderByDescending(h => h.DateMesure).Take(100).Select(h => new HistoriqueTemperatureDto
        {
            Id = h.Id, CapteurTemperatureId = h.CapteurTemperatureId,
            Valeur = h.Valeur, DateMesure = h.DateMesure
        }).ToList());
    }
}

// ─── Niveaux Azote ───

[ApiController]
[Route("api/niveaux-azote")]
public class NiveauxAzoteController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NiveauAzoteDto>>> GetAll()
    {
        var list = await uow.NiveauxAzote.ListAsync();
        var bonbonnes = await uow.Bonbonnes.ListAsync();
        return Ok(list.Select(n =>
        {
            var b = bonbonnes.FirstOrDefault(x => x.Id == n.BonbonneId);
            return new NiveauAzoteDto
            {
                Id = n.Id, BonbonneId = n.BonbonneId,
                BonbonneCode = b?.Code ?? "",
                NiveauPourcentage = n.NiveauPourcentage,
                VolumeLitres = n.VolumeLitres, CapaciteLitres = n.CapaciteLitres,
                SeuilAlerte = n.SeuilAlerte,
                DernierRemplissage = n.DernierRemplissage,
                ProchainRemplissage = n.ProchainRemplissage,
                Statut = n.Statut
            };
        }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NiveauAzoteDto dto)
    {
        var e = new NiveauAzote
        {
            BonbonneId = dto.BonbonneId,
            NiveauPourcentage = dto.NiveauPourcentage,
            VolumeLitres = dto.VolumeLitres, CapaciteLitres = dto.CapaciteLitres,
            SeuilAlerte = dto.SeuilAlerte,
            DernierRemplissage = dto.DernierRemplissage,
            ProchainRemplissage = dto.ProchainRemplissage,
            Statut = dto.Statut ?? "ok"
        };
        await uow.NiveauxAzote.AddAsync(e);
        await uow.SaveChangesAsync();
        return Created($"/api/niveaux-azote/{e.Id}", new { id = e.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] NiveauAzoteDto dto)
    {
        var e = await uow.NiveauxAzote.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.NiveauPourcentage = dto.NiveauPourcentage;
        e.VolumeLitres = dto.VolumeLitres;
        e.CapaciteLitres = dto.CapaciteLitres;
        e.SeuilAlerte = dto.SeuilAlerte;
        e.DernierRemplissage = dto.DernierRemplissage;
        e.ProchainRemplissage = dto.ProchainRemplissage;
        e.Statut = dto.NiveauPourcentage <= 15 ? "critique" : dto.NiveauPourcentage <= dto.SeuilAlerte ? "bas" : "ok";
        await uow.NiveauxAzote.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.NiveauxAzote.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.NiveauxAzote.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

// ─── Maintenances Préventives ───

[ApiController]
[Route("api/maintenances")]
public class MaintenancesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MaintenancePreventiveDto>>> GetAll()
    {
        var list = await uow.MaintenancesPreventives.ListAsync();
        return Ok(list.Select(m => new MaintenancePreventiveDto
        {
            Id = m.Id, Equipement = m.Equipement, TypeEquipement = m.TypeEquipement,
            TypeMaintenance = m.TypeMaintenance,
            DerniereExecution = m.DerniereExecution, ProchaineExecution = m.ProchaineExecution,
            FrequenceJours = m.FrequenceJours, Responsable = m.Responsable,
            Statut = m.Statut, Notes = m.Notes
        }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MaintenancePreventiveDto dto)
    {
        var e = new MaintenancePreventive
        {
            Equipement = dto.Equipement, TypeEquipement = dto.TypeEquipement ?? "bonbonne",
            TypeMaintenance = dto.TypeMaintenance,
            DerniereExecution = dto.DerniereExecution,
            ProchaineExecution = dto.ProchaineExecution,
            FrequenceJours = dto.FrequenceJours,
            Responsable = dto.Responsable ?? "", Statut = dto.Statut ?? "a_jour",
            Notes = dto.Notes ?? ""
        };
        await uow.MaintenancesPreventives.AddAsync(e);
        await uow.SaveChangesAsync();
        return Created($"/api/maintenances/{e.Id}", new { id = e.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MaintenancePreventiveDto dto)
    {
        var e = await uow.MaintenancesPreventives.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.Equipement = dto.Equipement;
        e.TypeEquipement = dto.TypeEquipement ?? e.TypeEquipement;
        e.TypeMaintenance = dto.TypeMaintenance;
        e.DerniereExecution = dto.DerniereExecution;
        e.ProchaineExecution = dto.ProchaineExecution;
        e.FrequenceJours = dto.FrequenceJours;
        e.Responsable = dto.Responsable ?? e.Responsable;
        e.Statut = dto.Statut ?? e.Statut;
        e.Notes = dto.Notes ?? e.Notes;
        await uow.MaintenancesPreventives.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:int}/executer")]
    public async Task<IActionResult> MarquerExecutee(int id)
    {
        var e = await uow.MaintenancesPreventives.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.DerniereExecution = DateTime.UtcNow;
        e.ProchaineExecution = DateTime.UtcNow.AddDays(e.FrequenceJours);
        e.Statut = "a_jour";
        await uow.MaintenancesPreventives.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.MaintenancesPreventives.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.MaintenancesPreventives.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

// ─── Alertes Cryo ───

[ApiController]
[Route("api/alertes-cryo")]
public class AlertesCryoController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AlerteCryoDto>>> GetAll()
    {
        var list = await uow.AlertesCryo.ListAsync();
        return Ok(list.OrderByDescending(a => a.DateAlerte).Select(a => new AlerteCryoDto
        {
            Id = a.Id, DateAlerte = a.DateAlerte, Type = a.Type,
            Severite = a.Severite, Message = a.Message,
            Equipement = a.Equipement, Acquittee = a.Acquittee
        }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AlerteCryoDto dto)
    {
        var e = new AlerteCryo
        {
            DateAlerte = DateTime.UtcNow, Type = dto.Type ?? "systeme",
            Severite = dto.Severite ?? "info", Message = dto.Message,
            Equipement = dto.Equipement ?? "", Acquittee = false
        };
        await uow.AlertesCryo.AddAsync(e);
        await uow.SaveChangesAsync();
        return Created($"/api/alertes-cryo/{e.Id}", new { id = e.Id });
    }

    [HttpPut("{id:int}/acquitter")]
    public async Task<IActionResult> Acquitter(int id)
    {
        var e = await uow.AlertesCryo.GetByIdAsync(id);
        if (e is null) return NotFound();
        e.Acquittee = true;
        await uow.AlertesCryo.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("acquitter-toutes")]
    public async Task<IActionResult> AcquitterToutes()
    {
        var all = await uow.AlertesCryo.ListAsync();
        var nonAcquittees = all.Where(a => !a.Acquittee).ToList();
        foreach (var a in nonAcquittees)
        {
            var entity = await uow.AlertesCryo.GetByIdAsync(a.Id);
            if (entity is null) continue;
            entity.Acquittee = true;
            await uow.AlertesCryo.UpdateAsync(entity);
        }
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.AlertesCryo.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.AlertesCryo.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

// ─── DTOs ───

public class CapteurTemperatureDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public int BonbonneId { get; set; }
    public string BonbonneCode { get; set; } = "";
    public double TemperatureActuelle { get; set; }
    public double TemperatureCible { get; set; }
    public double SeuilAlerte { get; set; }
    public string? Statut { get; set; }
    public DateTime DerniereMaj { get; set; }
}

public class UpdateTemperatureDto
{
    public double Valeur { get; set; }
}

public class HistoriqueTemperatureDto
{
    public int Id { get; set; }
    public int CapteurTemperatureId { get; set; }
    public double Valeur { get; set; }
    public DateTime DateMesure { get; set; }
}

public class NiveauAzoteDto
{
    public int Id { get; set; }
    public int BonbonneId { get; set; }
    public string BonbonneCode { get; set; } = "";
    public double NiveauPourcentage { get; set; }
    public double VolumeLitres { get; set; }
    public double CapaciteLitres { get; set; }
    public double SeuilAlerte { get; set; }
    public DateTime DernierRemplissage { get; set; }
    public DateTime ProchainRemplissage { get; set; }
    public string? Statut { get; set; }
}

public class MaintenancePreventiveDto
{
    public int Id { get; set; }
    public string Equipement { get; set; } = "";
    public string? TypeEquipement { get; set; }
    public string TypeMaintenance { get; set; } = "";
    public DateTime DerniereExecution { get; set; }
    public DateTime ProchaineExecution { get; set; }
    public int FrequenceJours { get; set; }
    public string? Responsable { get; set; }
    public string? Statut { get; set; }
    public string? Notes { get; set; }
}

public class AlerteCryoDto
{
    public int Id { get; set; }
    public DateTime DateAlerte { get; set; }
    public string? Type { get; set; }
    public string? Severite { get; set; }
    public string Message { get; set; } = "";
    public string? Equipement { get; set; }
    public bool Acquittee { get; set; }
}
