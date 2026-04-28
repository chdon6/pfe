using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;
using PMA.Api.Services;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/actespma")]
public class ActesPmaController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet("types")]
    public ActionResult<IReadOnlyList<ActeTypeOptionDto>> GetTypes()
    {
        var list = ActePmaCatalog.Codes.Select(c => new ActeTypeOptionDto
        {
            Code = c,
            Libelle = ActePmaCatalog.LibelleDefaut(c)
        }).ToList();
        return Ok(list);
    }

    [HttpGet("by-patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<ActePmaDto>>> GetByPatient(int patientId)
    {
        var all = await uow.ActesPma.ListAsync();
        var list = all.Where(a => a.PatientId == patientId).Select(Map).ToList();
        return Ok(list);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActePmaDto>>> GetAll()
    {
        var list = await uow.ActesPma.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ActePmaDto>> GetById(int id)
    {
        var a = await uow.ActesPma.GetByIdAsync(id);
        return a is null ? NotFound() : Ok(Map(a));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ActePmaDto dto)
    {
        if (dto.PatientId <= 0)
            return BadRequest("Patient invalide.");
        if (!ActePmaCatalog.IsValidType(dto.TypeActe))
            return BadRequest("Type d'acte invalide. Utilisez GET /api/actespma/types pour la liste.");
        var type = ActePmaCatalog.NormalizeType(dto.TypeActe!);
        var statut = ActePmaCatalog.NormalizeStatut(dto.StatutRealisation);
        if (!ActePmaCatalog.IsValidStatut(statut))
            return BadRequest("Statut de réalisation invalide (a_realiser, en_cours, realise, annule).");

        var libelle = string.IsNullOrWhiteSpace(dto.Libelle)
            ? ActePmaCatalog.LibelleDefaut(type)
            : dto.Libelle.Trim();

        var e = new ActePma
        {
            TypeActe = type,
            Libelle = libelle,
            Observation = string.IsNullOrWhiteSpace(dto.Observation) ? null : dto.Observation.Trim(),
            StatutRealisation = statut,
            PatientId = dto.PatientId
        };
        await uow.ActesPma.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ActePmaDto dto)
    {
        var e = await uow.ActesPma.GetByIdAsync(id);
        if (e is null) return NotFound();
        if (!ActePmaCatalog.IsValidType(dto.TypeActe))
            return BadRequest("Type d'acte invalide.");
        var type = ActePmaCatalog.NormalizeType(dto.TypeActe!);
        var statut = ActePmaCatalog.NormalizeStatut(dto.StatutRealisation);
        if (!ActePmaCatalog.IsValidStatut(statut))
            return BadRequest("Statut de réalisation invalide.");

        e.TypeActe = type;
        e.StatutRealisation = statut;
        e.Libelle = string.IsNullOrWhiteSpace(dto.Libelle) ? ActePmaCatalog.LibelleDefaut(type) : dto.Libelle.Trim();
        e.Observation = string.IsNullOrWhiteSpace(dto.Observation) ? null : dto.Observation.Trim();
        if (dto.PatientId > 0)
            e.PatientId = dto.PatientId;

        await uow.ActesPma.UpdateAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.ActesPma.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.ActesPma.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private static ActePmaDto Map(ActePma a) => new()
    {
        Id = a.Id,
        TypeActe = a.TypeActe,
        Libelle = a.Libelle,
        Observation = a.Observation,
        StatutRealisation = string.IsNullOrEmpty(a.StatutRealisation) ? "a_realiser" : a.StatutRealisation,
        PatientId = a.PatientId
    };
}

public class ActePmaDto
{
    public int Id { get; set; }
    public string TypeActe { get; set; } = "";
    public string Libelle { get; set; } = "";
    public string? Observation { get; set; }
    public string StatutRealisation { get; set; } = "a_realiser";
    public int PatientId { get; set; }
}

public class ActeTypeOptionDto
{
    public string Code { get; set; } = "";
    public string Libelle { get; set; } = "";
}
