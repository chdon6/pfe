using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/protocoles")]
public class ProtocolesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProtocoleDto>>> GetAll()
    {
        var list = await uow.Protocoles.ListAsync();
        return Ok(list.Select(p => new ProtocoleDto { Id = p.Id, Type = p.Type }).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProtocoleDto>> GetById(int id)
    {
        var p = await uow.Protocoles.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(new ProtocoleDto { Id = p.Id, Type = p.Type });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProtocoleDto dto)
    {
        var e = new Protocole { Type = dto.Type };
        await uow.Protocoles.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.Protocoles.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.Protocoles.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

public class ProtocoleDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
}
