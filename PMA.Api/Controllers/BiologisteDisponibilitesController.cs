using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace PMA.Api.Controllers;

/// <summary>
/// Stockage des disponibilités du biologiste dans un fichier JSON sur disque.
/// Aucune dépendance Oracle / migration EF requise.
/// Clé  = yyyy-MM-dd, valeur = false si indisponible (absent ou true = disponible).
/// </summary>
[ApiController]
[Route("api/biologiste-disponibilites")]
public class BiologisteDisponibilitesController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly string FilePath = Path.Combine(
        AppContext.BaseDirectory, "biologiste_disponibilites.json");

    private static readonly SemaphoreSlim Lock = new(1, 1);

    // ─── GET ────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<Dictionary<string, bool>>> GetAsync()
    {
        var map = await ReadFileAsync();
        return Ok(map);
    }

    // ─── PUT ────────────────────────────────────────────────────────────────────
    [HttpPut]
    public async Task<IActionResult> PutAsync([FromBody] Dictionary<string, bool>? dispos)
    {
        await WriteFileAsync(dispos ?? new Dictionary<string, bool>());
        return NoContent();
    }

    // ─── helpers ────────────────────────────────────────────────────────────────
    private static async Task<Dictionary<string, bool>> ReadFileAsync()
    {
        await Lock.WaitAsync();
        try
        {
            if (!System.IO.File.Exists(FilePath))
                return new Dictionary<string, bool>();

            var json = await System.IO.File.ReadAllTextAsync(FilePath);
            if (string.IsNullOrWhiteSpace(json))
                return new Dictionary<string, bool>();

            return JsonSerializer.Deserialize<Dictionary<string, bool>>(json, JsonOpts)
                   ?? new Dictionary<string, bool>();
        }
        catch
        {
            return new Dictionary<string, bool>();
        }
        finally
        {
            Lock.Release();
        }
    }

    private static async Task WriteFileAsync(Dictionary<string, bool> map)
    {
        await Lock.WaitAsync();
        try
        {
            var json = JsonSerializer.Serialize(map, JsonOpts);
            await System.IO.File.WriteAllTextAsync(FilePath, json);
        }
        finally
        {
            Lock.Release();
        }
    }
}
