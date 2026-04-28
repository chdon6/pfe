using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;
using PMA.Api.Services;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/consentements")]
public class ConsentementsController(IUnitOfWork uow, IWebHostEnvironment env) : ControllerBase
{
    private string AbsUrl(string? path)
    {
        if (string.IsNullOrEmpty(path)) return "";
        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return path;
        return $"{Request.Scheme}://{Request.Host.Value}{path}";
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ConsentementDto>>> GetAll()
    {
        var list = await uow.Consentements.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConsentementDto>> GetById(int id)
    {
        var c = await uow.Consentements.GetByIdAsync(id);
        return c is null ? NotFound() : Ok(Map(c));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(
        [FromForm] int patientId,
        [FromForm] string type,
        [FromForm] string dateSignature,
        IFormFile? photoConsentement,
        IFormFile? cinHomme,
        IFormFile? cinFemme,
        IFormFile? contratMariage)
    {
        var patient = await uow.Patients.GetByIdAsync(patientId);
        if (patient is null)
            return BadRequest("Patient introuvable.");
        if (string.IsNullOrWhiteSpace(type))
            return BadRequest("Le type de consentement est obligatoire.");
        if (!DateTime.TryParse(dateSignature, out var ds))
            return BadRequest("Date de signature invalide.");
        if (photoConsentement is null || photoConsentement.Length == 0)
            return BadRequest("La photo ou le scan du consentement signé est obligatoire.");

        var kind = string.IsNullOrEmpty(patient.TypeDossier) ? "couple" : patient.TypeDossier.Trim().ToLowerInvariant();

        var consent = new Consentement
        {
            Type = type.Trim(),
            DateSignature = ds.Date,
            PatientId = patientId
        };
        await uow.Consentements.AddAsync(consent);
        await uow.SaveChangesAsync();

        consent.PhotoPath = await ConsentementUploadHelper.SaveAsync(env, consent.Id, "photo", photoConsentement);
        if (kind == "couple")
        {
            if (cinHomme is { Length: > 0 })
                consent.CinHommePath = await ConsentementUploadHelper.SaveAsync(env, consent.Id, "cin_homme", cinHomme);
            if (cinFemme is { Length: > 0 })
                consent.CinFemmePath = await ConsentementUploadHelper.SaveAsync(env, consent.Id, "cin_femme", cinFemme);
            if (contratMariage is { Length: > 0 })
                consent.ContratMariagePath = await ConsentementUploadHelper.SaveAsync(env, consent.Id, "contrat_mariage", contratMariage);
        }

        await uow.Consentements.UpdateAsync(consent);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = consent.Id }, new { id = consent.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.Consentements.GetByIdAsync(id);
        if (e is null) return NotFound();
        ConsentementUploadHelper.DeleteIfExists(env, e.PhotoPath);
        ConsentementUploadHelper.DeleteIfExists(env, e.CinHommePath);
        ConsentementUploadHelper.DeleteIfExists(env, e.CinFemmePath);
        ConsentementUploadHelper.DeleteIfExists(env, e.ContratMariagePath);
        await uow.Consentements.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private ConsentementDto Map(Consentement c) => new()
    {
        Id = c.Id,
        Type = c.Type,
        DateSignature = c.DateSignature,
        PatientId = c.PatientId,
        PhotoPath = AbsUrl(c.PhotoPath),
        CinHommePath = AbsUrl(c.CinHommePath),
        CinFemmePath = AbsUrl(c.CinFemmePath),
        ContratMariagePath = AbsUrl(c.ContratMariagePath)
    };
}

public class ConsentementDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
    public DateTime DateSignature { get; set; }
    public int PatientId { get; set; }
    public string? PhotoPath { get; set; }
    public string? CinHommePath { get; set; }
    public string? CinFemmePath { get; set; }
    public string? ContratMariagePath { get; set; }
}
