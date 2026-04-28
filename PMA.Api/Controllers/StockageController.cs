using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/bonbonnes")]
public class BonbonnesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BonbonneDto>>> GetAll()
    {
        var list = await uow.Bonbonnes.ListAsync();
        return Ok(list.Select(b => new BonbonneDto
        {
            Id = b.Id,
            Code = b.Code,
            Couleur = b.Couleur,
            TypeStockage = b.TypeStockage,
            Temperature = b.Temperature
        }).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BonbonneDto>> GetById(int id)
    {
        var b = await uow.Bonbonnes.GetByIdAsync(id);
        return b is null
            ? NotFound()
            : Ok(new BonbonneDto
            {
                Id = b.Id,
                Code = b.Code,
                Couleur = b.Couleur,
                TypeStockage = b.TypeStockage,
                Temperature = b.Temperature
            });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BonbonneDto dto)
    {
        var e = new Bonbonne
        {
            Code = dto.Code?.Trim() ?? "",
            Couleur = dto.Couleur?.Trim() ?? "",
            TypeStockage = dto.TypeStockage ?? "",
            Temperature = dto.Temperature ?? ""
        };
        await uow.Bonbonnes.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.Bonbonnes.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.Bonbonnes.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/canisters")]
public class CanistersController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CanisterDto>>> GetAll()
    {
        var list = await uow.Canisters.ListAsync();
        return Ok(list.Select(c => new CanisterDto { Id = c.Id, Numero = c.Numero, BonbonneId = c.BonbonneId }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CanisterDto dto)
    {
        var e = new Canister { Numero = dto.Numero, BonbonneId = dto.BonbonneId };
        await uow.Canisters.AddAsync(e);
        await uow.SaveChangesAsync();
        return Created($"/api/canisters/{e.Id}", new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.Canisters.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.Canisters.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/paillestubes")]
public class PaillesTubesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PailleTubeDto>>> GetAll()
    {
        var list = await uow.PailleTubes.ListAsync();
        return Ok(list.Select(p => new PailleTubeDto
        {
            Id = p.Id,
            CodeBarre = p.CodeBarre,
            TypeContenu = p.TypeContenu,
            CouleurVisotube = p.CouleurVisotube,
            CyclePmaId = p.CyclePmaId,
            PatientId = p.PatientId,
            CanisterId = p.CanisterId,
            Position = p.Position
        }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PailleTubeDto dto)
    {
        if (dto.CanisterId <= 0 || dto.Position <= 0)
            return BadRequest("Canister et position obligatoires.");
        if (string.IsNullOrWhiteSpace(dto.CodeBarre))
            return BadRequest("Code-barres obligatoire.");

        int? resolvedPatientId = dto.PatientId;
        int? resolvedCycleId = dto.CyclePmaId is > 0 ? dto.CyclePmaId : null;

        if (resolvedCycleId is { } cid)
        {
            var cycle = await uow.CyclesPma.GetByIdAsync(cid);
            if (cycle is null) return BadRequest("Cycle PMA introuvable.");
            resolvedPatientId = cycle.PatientId;
        }
        else if (resolvedPatientId is { } pid && pid > 0)
        {
            var pat = await uow.Patients.GetByIdAsync(pid);
            if (pat is null) return BadRequest("Patient introuvable.");
        }
        else
            return BadRequest("Renseignez un cycle PMA ou un patient (cryoconservation hors cycle AMP).");

        var can = await uow.Canisters.GetByIdAsync(dto.CanisterId);
        if (can is null) return BadRequest("Canister introuvable.");

        var occupes = await uow.PailleTubes.ListAsync(p => p.CanisterId == dto.CanisterId && p.Position == dto.Position);
        if (occupes.Count > 0)
            return BadRequest("Cette position est déjà occupée sur ce canister.");

        var e = new PailleTube
        {
            CodeBarre = dto.CodeBarre.Trim(),
            TypeContenu = dto.TypeContenu ?? "",
            CouleurVisotube = string.IsNullOrWhiteSpace(dto.CouleurVisotube) ? null : dto.CouleurVisotube.Trim(),
            CyclePmaId = resolvedCycleId,
            PatientId = resolvedCycleId is not null ? null : resolvedPatientId,
            CanisterId = dto.CanisterId,
            Position = dto.Position
        };
        await uow.PailleTubes.AddAsync(e);
        await uow.SaveChangesAsync();
        return Created($"/api/paillestubes/{e.Id}", new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.PailleTubes.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.PailleTubes.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

public class BonbonneDto
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Couleur { get; set; } = "";
    public string TypeStockage { get; set; } = "";
    public string Temperature { get; set; } = "";
}

public class CanisterDto
{
    public int Id { get; set; }
    public int Numero { get; set; }
    public int BonbonneId { get; set; }
}

public class PailleTubeDto
{
    public int Id { get; set; }
    public string CodeBarre { get; set; } = "";
    public string TypeContenu { get; set; } = "";
    public string? CouleurVisotube { get; set; }
    /// <summary>Si renseigné : tube rattaché au cycle AMP. Sinon utiliser <see cref="PatientId"/>.</summary>
    public int? CyclePmaId { get; set; }
    /// <summary>Si pas de cycle : dossier patient (ex. conservation de sperme sans stimulation).</summary>
    public int? PatientId { get; set; }
    public int CanisterId { get; set; }
    public int Position { get; set; }
}
