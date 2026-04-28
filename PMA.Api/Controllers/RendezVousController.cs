using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/rendezvous")]
public class RendezVousController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RendezVousDto>>> GetAll()
    {
        var list = await uow.RendezVous.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RendezVousDto>> GetById(int id)
    {
        var r = await uow.RendezVous.GetByIdAsync(id);
        return r is null ? NotFound() : Ok(Map(r));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RendezVousDto dto)
    {
        var e = new RendezVous
        {
            DateHeure = dto.DateHeure,
            Motif = dto.Motif ?? "",
            Statut = string.IsNullOrEmpty(dto.Statut) ? "planifie" : dto.Statut,
            PatientId = dto.PatientId
        };
        await uow.RendezVous.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.RendezVous.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.RendezVous.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private static RendezVousDto Map(RendezVous r) => new()
    {
        Id = r.Id,
        DateHeure = r.DateHeure,
        Motif = r.Motif,
        Statut = r.Statut,
        PatientId = r.PatientId
    };
}

public class RendezVousDto
{
    public int Id { get; set; }
    public DateTime DateHeure { get; set; }
    public string Motif { get; set; } = "";
    public string Statut { get; set; } = "planifie";
    public int PatientId { get; set; }
}
