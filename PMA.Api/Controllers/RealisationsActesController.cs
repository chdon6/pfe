using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/realisationsactes")]
public class RealisationsActesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RealisationActeDto>>> GetAll()
    {
        var list = await uow.RealisationsActes.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RealisationActeDto>> GetById(int id)
    {
        var r = await uow.RealisationsActes.GetByIdAsync(id);
        return r is null ? NotFound() : Ok(Map(r));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RealisationActeDto dto)
    {
        var e = new RealisationActe
        {
            DateRealisation = dto.DateRealisation == default ? DateTime.UtcNow : dto.DateRealisation,
            Resultat = dto.Resultat ?? "",
            Observation = dto.Observation,
            Statut = dto.Statut ?? "",
            ActePmaId = dto.ActePmaId,
            UserId = dto.UserId
        };
        await uow.RealisationsActes.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.RealisationsActes.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.RealisationsActes.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private static RealisationActeDto Map(RealisationActe r) => new()
    {
        Id = r.Id,
        DateRealisation = r.DateRealisation,
        Resultat = r.Resultat,
        Observation = r.Observation,
        Statut = r.Statut,
        ActePmaId = r.ActePmaId,
        UserId = r.UserId
    };
}

public class RealisationActeDto
{
    public int Id { get; set; }
    public DateTime DateRealisation { get; set; }
    public string Resultat { get; set; } = "";
    public string? Observation { get; set; }
    public string Statut { get; set; } = "";
    public int ActePmaId { get; set; }
    public int UserId { get; set; }
}
