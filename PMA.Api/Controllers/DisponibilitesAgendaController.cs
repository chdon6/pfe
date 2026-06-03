using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/disponibilites-agenda")]
public class DisponibilitesAgendaController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly string _filePath;

    public DisponibilitesAgendaController(IWebHostEnvironment env)
    {
        var dir = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(dir);
        _filePath = Path.Combine(dir, "disponibilites-agenda.json");
        if (!System.IO.File.Exists(_filePath))
            System.IO.File.WriteAllText(_filePath, "[]");
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DisponibiliteAgendaDto>>> GetAll(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        var list = await ReadAllAsync();
        list = list.Where(x => x.NonDisponible).ToList();

        if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var dFrom))
            list = list.Where(x => x.Date.Date >= dFrom.Date).ToList();

        if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var dTo))
            list = list.Where(x => x.Date.Date <= dTo.Date).ToList();

        return Ok(list.Select(Map).ToList());
    }

    [HttpPut]
    public async Task<ActionResult<DisponibiliteAgendaDto?>> Set([FromBody] SetDisponibiliteAgendaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Date) || !DateTime.TryParse(dto.Date, out var date))
            return BadRequest("Date invalide (format attendu : yyyy-MM-dd).");

        var day = date.Date;
        var list = await ReadAllAsync();
        var existing = list.FirstOrDefault(x => x.Date.Date == day);

        if (!dto.NonDisponible)
        {
            if (existing is not null)
                list.Remove(existing);
            await WriteAllAsync(list);
            return Ok(null);
        }

        if (existing is null)
        {
            existing = new DisponibiliteAgendaEntry
            {
                Id = list.Count > 0 ? list.Max(x => x.Id) + 1 : 1,
                Date = day,
                NonDisponible = true,
                ModifieLe = DateTime.UtcNow
            };
            list.Add(existing);
        }
        else
        {
            existing.NonDisponible = true;
            existing.ModifieLe = DateTime.UtcNow;
        }

        await WriteAllAsync(list);
        return Ok(Map(existing));
    }

    private async Task<List<DisponibiliteAgendaEntry>> ReadAllAsync()
    {
        await using var stream = System.IO.File.OpenRead(_filePath);
        var raw = await JsonSerializer.DeserializeAsync<List<DisponibiliteAgendaEntryRaw>>(stream, JsonOpts) ?? [];

        return raw.Select(Normalize).Where(x => x.NonDisponible).ToList();
    }

    private static DisponibiliteAgendaEntry Normalize(DisponibiliteAgendaEntryRaw r)
    {
        var nonDispo = r.NonDisponible || (r.Confirme.HasValue && !r.Confirme.Value);
        return new DisponibiliteAgendaEntry
        {
            Id = r.Id,
            Date = r.Date,
            NonDisponible = nonDispo,
            ModifieLe = r.ModifieLe
        };
    }

    private async Task WriteAllAsync(List<DisponibiliteAgendaEntry> list)
    {
        await using var stream = System.IO.File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, list, JsonOpts);
    }

    private static DisponibiliteAgendaDto Map(DisponibiliteAgendaEntry e) => new()
    {
        Id = e.Id,
        Date = e.Date.ToString("yyyy-MM-dd"),
        NonDisponible = true,
        ModifieLe = e.ModifieLe
    };

    private sealed class DisponibiliteAgendaEntry
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public bool NonDisponible { get; set; }
        public DateTime ModifieLe { get; set; }
    }

    private sealed class DisponibiliteAgendaEntryRaw
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public bool NonDisponible { get; set; }
        public bool? Confirme { get; set; }
        public DateTime ModifieLe { get; set; }
    }
}

public class DisponibiliteAgendaDto
{
    public int Id { get; set; }
    public string Date { get; set; } = "";
    public bool NonDisponible { get; set; }
    public DateTime ModifieLe { get; set; }
}

public class SetDisponibiliteAgendaDto
{
    public string Date { get; set; } = "";
    public bool NonDisponible { get; set; }
}
