using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/profiles")]
[Authorize]
public class ProfilesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProfileDto>>> GetAll()
    {
        var list = await uow.Profiles.ListAsync();
        return Ok(list.Select(p => new ProfileDto { Id = p.Id, Libelle = p.Libelle }).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProfileDto>> GetById(int id)
    {
        var p = await uow.Profiles.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(new ProfileDto { Id = p.Id, Libelle = p.Libelle });
    }

    [HttpPost]
    [Authorize(Roles = "Administrateur")]
    public async Task<IActionResult> Create([FromBody] ProfileDto dto)
    {
        var e = new Profile { Libelle = dto.Libelle };
        await uow.Profiles.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Administrateur")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.Profiles.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.Profiles.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

public class ProfileDto
{
    public int Id { get; set; }
    public string Libelle { get; set; } = "";
}
