using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;
using PMA.Api.Services;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/patients")]
public class PatientsController(IUnitOfWork uow, IWebHostEnvironment env) : ControllerBase
{
    private string AbsUrl(string? path)
    {
        if (string.IsNullOrEmpty(path)) return "";
        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return path;
        return $"{Request.Scheme}://{Request.Host.Value}{path}";
    }

    private PatientDto Map(Patient p) => new()
    {
        Id = p.Id,
        Nom = p.Nom,
        Prenom = p.Prenom,
        DateNaissance = p.DateNaissance,
        FemmeNom = p.FemmeNom,
        FemmePrenom = p.FemmePrenom,
        FemmeDateNaissance = p.FemmeDateNaissance,
        NumDossier = p.NumDossier,
        TypeDossier = string.IsNullOrEmpty(p.TypeDossier) ? "couple" : p.TypeDossier,
        TypeActePma = p.TypeActePma,
        Adresse = p.Adresse,
        Telephone = p.Telephone,
        ImagePath = AbsUrl(p.ImagePath)
    };

    private static string? NormalizeTypeDossier(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "couple";
        var v = value.Trim().ToLowerInvariant();
        return v is "couple" or "spermogramme" or "femme_seul" ? v : null;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PatientDto>>> GetAll()
    {
        var list = await uow.Patients.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    /// <summary>Recherche par numéro de dossier (ex. code bracelet / scan accueil).</summary>
    [HttpGet("par-dossier/{numDossier}")]
    public async Task<ActionResult<PatientDto>> GetByNumDossier(string numDossier)
    {
        if (string.IsNullOrWhiteSpace(numDossier)) return NotFound();
        var key = Uri.UnescapeDataString(numDossier).Trim();
        var list = await uow.Patients.ListAsync();
        var p = list.FirstOrDefault(x => string.Equals(x.NumDossier.Trim(), key, StringComparison.OrdinalIgnoreCase));
        return p is null ? NotFound() : Ok(Map(p));
    }

    /// <summary>Prochain N° de dossier libre (calculé sur tous les patients en base).</summary>
    [HttpGet("prochain-numero-dossier")]
    public async Task<ActionResult<ProchainNumeroDossierDto>> GetProchainNumeroDossier()
    {
        var list = await uow.Patients.ListAsync();
        var nums = list.Select(p => p.NumDossier).ToList();
        var next = NumeroDossierGenerator.AllocateNext(nums);
        var seq = NumeroDossierGenerator.ExtractSequence(next);
        return Ok(new ProchainNumeroDossierDto { NumDossier = next, Sequence = seq });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(int id)
    {
        var p = await uow.Patients.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(Map(p));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(
        [FromForm] string nom,
        [FromForm] string prenom,
        [FromForm] string dateNaissance,
        [FromForm] string numDossier,
        [FromForm] string? adresse,
        [FromForm] string? telephone,
        [FromForm] string? typeDossier,
        [FromForm] string? femmeNom,
        [FromForm] string? femmePrenom,
        [FromForm] string? femmeDateNaissance,
        [FromForm] string? consentementType,
        [FromForm] string? consentementDate,
        [FromForm] string? typeActePma,
        IFormFile? photoCouple,
        IFormFile? photoConsentement,
        IFormFile? cinHomme,
        IFormFile? cinFemme,
        IFormFile? contratMariage)
    {
        if (string.IsNullOrWhiteSpace(typeActePma) || !ActePmaCatalog.IsValidType(typeActePma))
            return BadRequest("L'acte PMA prévu est obligatoire : choisissez un type dans la liste.");

        var dossierKind = NormalizeTypeDossier(typeDossier);
        if (dossierKind is null)
            return BadRequest("Type de dossier invalide. Utilisez « couple », « spermogramme » ou « femme_seul ».");

        if (photoCouple is null || photoCouple.Length == 0)
            return BadRequest("La photo est obligatoire (identitovigilance), pour tout dossier.");

        if (string.IsNullOrWhiteSpace(consentementType) || string.IsNullOrWhiteSpace(consentementDate))
            return BadRequest("Le consentement est obligatoire.");
        if (photoConsentement is null || photoConsentement.Length == 0)
            return BadRequest("La photo ou le scan du consentement signé est obligatoire.");
        if (!DateTime.TryParse(dateNaissance, out var dn))
            return BadRequest("Date de naissance de l'homme invalide.");
        if (!DateTime.TryParse(consentementDate, out var ds))
            return BadRequest("Date de signature invalide.");

        string? fn = null, fp = null;
        DateTime? fdn = null;
        if (dossierKind == "couple")
        {
            if (string.IsNullOrWhiteSpace(femmeNom) || string.IsNullOrWhiteSpace(femmePrenom) ||
                string.IsNullOrWhiteSpace(femmeDateNaissance))
                return BadRequest("Le nom, prénom et date de naissance de la femme sont obligatoires pour un dossier couple.");
            if (!DateTime.TryParse(femmeDateNaissance, out var fdnParsed))
                return BadRequest("Date de naissance de la femme invalide.");
            fn = femmeNom.Trim();
            fp = femmePrenom.Trim();
            fdn = fdnParsed;
        }

        var allPatients = await uow.Patients.ListAsync();
        var allocatedNum = NumeroDossierGenerator.AllocateNext(allPatients.Select(p => p.NumDossier));
        if (!string.IsNullOrWhiteSpace(numDossier))
        {
            var requested = numDossier.Trim();
            var taken = allPatients.Any(p =>
                string.Equals(p.NumDossier.Trim(), requested, StringComparison.OrdinalIgnoreCase));
            if (taken)
                return BadRequest($"Le numéro de dossier « {requested} » existe déjà. Utilisez {allocatedNum}.");
            if (!string.Equals(requested, allocatedNum, StringComparison.OrdinalIgnoreCase))
                return BadRequest(
                    $"Numéro de dossier obsolète. Le prochain numéro libre est {allocatedNum} (attribué automatiquement).");
        }

        var patient = new Patient
        {
            Nom = nom,
            Prenom = prenom,
            DateNaissance = dn,
            FemmeNom = fn,
            FemmePrenom = fp,
            FemmeDateNaissance = fdn,
            NumDossier = allocatedNum,
            Adresse = adresse,
            Telephone = string.IsNullOrWhiteSpace(telephone) ? null : telephone.Trim(),
            TypeDossier = dossierKind,
            TypeActePma = ActePmaCatalog.NormalizeType(typeActePma!),
            ImagePath = null
        };
        await uow.Patients.AddAsync(patient);
        await uow.SaveChangesAsync();

        var ext = Path.GetExtension(photoCouple.FileName);
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var uploads = Path.Combine(env.WebRootPath, "uploads", "patients");
        Directory.CreateDirectory(uploads);
        var rel = $"/uploads/patients/{patient.Id}{ext}";
        var full = Path.Combine(env.WebRootPath, "uploads", "patients", $"{patient.Id}{ext}");
        await using (var stream = System.IO.File.Create(full))
            await photoCouple.CopyToAsync(stream);

        patient.ImagePath = rel;
        await uow.Patients.UpdateAsync(patient);

        var consent = new Consentement
        {
            Type = consentementType.Trim(),
            DateSignature = ds.Date,
            PatientId = patient.Id
        };
        await uow.Consentements.AddAsync(consent);
        await uow.SaveChangesAsync();

        consent.PhotoPath = await ConsentementUploadHelper.SaveAsync(env, consent.Id, "photo", photoConsentement);
        if (dossierKind == "couple")
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
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, new { id = patient.Id });
    }

    [HttpPut("{id:int}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(
        int id,
        [FromForm] string nom,
        [FromForm] string prenom,
        [FromForm] string dateNaissance,
        [FromForm] string numDossier,
        [FromForm] string? adresse,
        [FromForm] string? telephone,
        [FromForm] string? typeDossier,
        [FromForm] string? femmeNom,
        [FromForm] string? femmePrenom,
        [FromForm] string? femmeDateNaissance,
        [FromForm] string? typeActePma,
        IFormFile? photoCouple)
    {
        var patient = await uow.Patients.GetByIdAsync(id);
        if (patient is null) return NotFound();
        if (!DateTime.TryParse(dateNaissance, out var dn))
            return BadRequest("Date de naissance de l'homme invalide.");

        if (!string.IsNullOrWhiteSpace(typeDossier))
        {
            var kind = NormalizeTypeDossier(typeDossier);
            if (kind is null)
                return BadRequest("Type de dossier invalide.");
            patient.TypeDossier = kind;
        }

        var effectiveKind = patient.TypeDossier;
        if (effectiveKind == "couple")
        {
            if (string.IsNullOrWhiteSpace(femmeNom) || string.IsNullOrWhiteSpace(femmePrenom) ||
                string.IsNullOrWhiteSpace(femmeDateNaissance))
                return BadRequest("Le nom, prénom et date de naissance de la femme sont obligatoires pour un dossier couple.");
            if (!DateTime.TryParse(femmeDateNaissance, out var fdn))
                return BadRequest("Date de naissance de la femme invalide.");
            patient.FemmeNom = femmeNom.Trim();
            patient.FemmePrenom = femmePrenom.Trim();
            patient.FemmeDateNaissance = fdn;
        }
        else
        {
            patient.FemmeNom = null;
            patient.FemmePrenom = null;
            patient.FemmeDateNaissance = null;
        }

        patient.Nom = nom;
        patient.Prenom = prenom;
        patient.DateNaissance = dn;
        patient.NumDossier = numDossier;
        patient.Adresse = adresse;
        patient.Telephone = string.IsNullOrWhiteSpace(telephone) ? null : telephone.Trim();

        if (string.IsNullOrWhiteSpace(typeActePma))
            patient.TypeActePma = null;
        else if (!ActePmaCatalog.IsValidType(typeActePma))
            return BadRequest("Type d'acte PMA invalide.");
        else
            patient.TypeActePma = ActePmaCatalog.NormalizeType(typeActePma);

        if (photoCouple is not null && photoCouple.Length > 0)
        {
            var ext = Path.GetExtension(photoCouple.FileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            var uploads = Path.Combine(env.WebRootPath, "uploads", "patients");
            Directory.CreateDirectory(uploads);
            var fileName = $"{id}{ext}";
            var full = Path.Combine(uploads, fileName);
            await using (var stream = System.IO.File.Create(full))
                await photoCouple.CopyToAsync(stream);
            patient.ImagePath = $"/uploads/patients/{fileName}";
        }

        await uow.Patients.UpdateAsync(patient);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var patient = await uow.Patients.GetByIdAsync(id);
        if (patient is null) return NotFound();
        if (!string.IsNullOrEmpty(patient.ImagePath) && patient.ImagePath.StartsWith("/uploads/", StringComparison.Ordinal))
        {
            var full = Path.Combine(env.WebRootPath, patient.ImagePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(full))
                System.IO.File.Delete(full);
        }
        await uow.Patients.DeleteAsync(patient);
        await uow.SaveChangesAsync();
        return NoContent();
    }
}

public class ProchainNumeroDossierDto
{
    public string NumDossier { get; set; } = "";
    public int Sequence { get; set; }
}

public class PatientDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public string Prenom { get; set; } = "";
    public DateTime DateNaissance { get; set; }
    public string? FemmeNom { get; set; }
    public string? FemmePrenom { get; set; }
    public DateTime? FemmeDateNaissance { get; set; }
    public string NumDossier { get; set; } = "";
    public string TypeDossier { get; set; } = "couple";
    public string? TypeActePma { get; set; }
    public string? Adresse { get; set; }
    public string? Telephone { get; set; }
    public string? ImagePath { get; set; }
}
