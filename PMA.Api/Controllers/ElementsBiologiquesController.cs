using Microsoft.AspNetCore.Mvc;
using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/elementsbiologiques")]
public class ElementsBiologiquesController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ElementBiologiqueDto>>> GetAll()
    {
        var list = await uow.ElementsBiologiques.ListAsync();
        return Ok(list.Select(Map).ToList());
    }

    /// <summary>
    /// Résout une étiquette scannée : élément biologique (CODEBARRE) ou paillette cryo (CODEBARRE),
    /// et retourne le patient associé.
    /// </summary>
    [HttpGet("lookup-etiquette/{code}")]
    public async Task<ActionResult<EtiquetteLookupDto>> LookupEtiquette(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return NotFound();
        var key = Uri.UnescapeDataString(code).Trim();

        var elements = await uow.ElementsBiologiques.ListAsync();
        var el = elements.FirstOrDefault(e =>
            !string.IsNullOrEmpty(e.CodeBarre) &&
            string.Equals(e.CodeBarre.Trim(), key, StringComparison.OrdinalIgnoreCase));
        if (el is not null)
        {
            var patient = await uow.Patients.GetByIdAsync(el.PatientId);
            if (patient is null) return NotFound();
            return Ok(new EtiquetteLookupDto
            {
                Trouve = true,
                Origine = "element_biologique",
                ElementBiologique = Map(el),
                Patient = MapPatientResume(patient)
            });
        }

        el = elements.FirstOrDefault(e =>
            !string.IsNullOrEmpty(e.NumeroTube) &&
            string.Equals(e.NumeroTube.Trim(), key, StringComparison.OrdinalIgnoreCase));
        if (el is not null)
        {
            var patient = await uow.Patients.GetByIdAsync(el.PatientId);
            if (patient is null) return NotFound();
            return Ok(new EtiquetteLookupDto
            {
                Trouve = true,
                Origine = "element_biologique",
                ElementBiologique = Map(el),
                Patient = MapPatientResume(patient)
            });
        }

        var tubes = await uow.PailleTubes.ListAsync(p =>
            !string.IsNullOrEmpty(p.CodeBarre) &&
            string.Equals(p.CodeBarre.Trim(), key, StringComparison.OrdinalIgnoreCase));
        var tube = tubes.FirstOrDefault();
        if (tube is not null)
        {
            Patient? patient = null;
            if (tube.CyclePmaId is { } cid && cid > 0)
            {
                var cycle = await uow.CyclesPma.GetByIdAsync(cid);
                if (cycle is null) return NotFound();
                patient = await uow.Patients.GetByIdAsync(cycle.PatientId);
            }
            else if (tube.PatientId is { } pid && pid > 0)
            {
                patient = await uow.Patients.GetByIdAsync(pid);
            }

            if (patient is null) return NotFound();
            return Ok(new EtiquetteLookupDto
            {
                Trouve = true,
                Origine = "paillette_cryo",
                Paillette = new PailletteResumeDto
                {
                    Id = tube.Id,
                    CodeBarre = tube.CodeBarre,
                    TypeContenu = tube.TypeContenu,
                    CyclePmaId = tube.CyclePmaId,
                    PatientId = tube.PatientId
                },
                Patient = MapPatientResume(patient)
            });
        }

        return Ok(new EtiquetteLookupDto { Trouve = false });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ElementBiologiqueDto>> GetById(int id)
    {
        var e = await uow.ElementsBiologiques.GetByIdAsync(id);
        return e is null ? NotFound() : Ok(Map(e));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ElementBiologiqueDto dto)
    {
        var code = string.IsNullOrWhiteSpace(dto.CodeBarre) ? null : dto.CodeBarre.Trim();
        var e = new ElementBiologique
        {
            TypeElement = dto.TypeElement ?? "",
            DateCreation = dto.DateCreation == default ? DateTime.UtcNow : dto.DateCreation,
            NumeroTube = string.IsNullOrWhiteSpace(dto.NumeroTube) ? null : dto.NumeroTube.Trim(),
            CodeBarre = code,
            PatientId = dto.PatientId
        };
        await uow.ElementsBiologiques.AddAsync(e);
        await uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { id = e.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await uow.ElementsBiologiques.GetByIdAsync(id);
        if (e is null) return NotFound();
        await uow.ElementsBiologiques.DeleteAsync(e);
        await uow.SaveChangesAsync();
        return NoContent();
    }

    private static ElementBiologiqueDto Map(ElementBiologique e) => new()
    {
        Id = e.Id,
        TypeElement = e.TypeElement,
        DateCreation = e.DateCreation,
        NumeroTube = e.NumeroTube,
        CodeBarre = e.CodeBarre,
        PatientId = e.PatientId
    };

    private static PatientResumeDto MapPatientResume(Patient p) => new()
    {
        Id = p.Id,
        Nom = p.Nom,
        Prenom = p.Prenom,
        NumDossier = p.NumDossier,
        FemmeNom = p.FemmeNom,
        FemmePrenom = p.FemmePrenom,
        TypeDossier = string.IsNullOrEmpty(p.TypeDossier) ? "couple" : p.TypeDossier
    };
}

public class ElementBiologiqueDto
{
    public int Id { get; set; }
    public string TypeElement { get; set; } = "";
    public DateTime DateCreation { get; set; }
    public string? NumeroTube { get; set; }
    public string? CodeBarre { get; set; }
    public int PatientId { get; set; }
}

public class EtiquetteLookupDto
{
    public bool Trouve { get; set; }
    /// <summary>element_biologique | paillette_cryo</summary>
    public string? Origine { get; set; }
    public ElementBiologiqueDto? ElementBiologique { get; set; }
    public PailletteResumeDto? Paillette { get; set; }
    public PatientResumeDto? Patient { get; set; }
}

public class PailletteResumeDto
{
    public int Id { get; set; }
    public string CodeBarre { get; set; } = "";
    public string TypeContenu { get; set; } = "";
    public int? CyclePmaId { get; set; }
    public int? PatientId { get; set; }
}

public class PatientResumeDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public string Prenom { get; set; } = "";
    public string NumDossier { get; set; } = "";
    public string? FemmeNom { get; set; }
    public string? FemmePrenom { get; set; }
    public string TypeDossier { get; set; } = "couple";
}
