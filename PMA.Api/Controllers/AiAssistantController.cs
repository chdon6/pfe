using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMA.Api.Interfaces;

namespace PMA.Api.Controllers;

[ApiController]
[Route("api/ai-assistant")]
[Authorize(Roles = "Secretaire,Biologiste,Technicien,Administrateur")]
public class AiAssistantController(IAiAssistantService ai, IUnitOfWork uow) : ControllerBase
{
    [HttpPost("suggest-rdv-motif")]
    public async Task<ActionResult<SuggestRdvMotifResponse>> SuggestRdvMotif([FromBody] SuggestRdvMotifRequest request)
    {
        var patientLabel = request.PatientDisplayName;
        if (request.PatientId is > 0)
        {
            var p = await uow.Patients.GetByIdAsync(request.PatientId.Value);
            if (p is not null)
                patientLabel = $"{p.Prenom} {p.Nom}".Trim();
        }

        var suggestions = ai.SuggestRendezVousMotifs(patientLabel, request.DateHeure, request.CurrentMotif);
        return Ok(new SuggestRdvMotifResponse { Suggestions = suggestions });
    }

    [HttpPost("reformulate-note")]
    public ActionResult<ReformulateNoteResponse> ReformulateNote([FromBody] ReformulateNoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Note))
            return BadRequest("Le texte est obligatoire.");

        var result = ai.ReformulateAdministrativeNote(request.Note);
        return Ok(new ReformulateNoteResponse { ReformulatedNote = result });
    }

    [HttpPost("summarize-patient")]
    public ActionResult<SummarizePatientResponse> SummarizePatient([FromBody] SummarizePatientRequest request)
    {
        var summary = ai.SummarizePatientTimeline(new PatientTimelineContext
        {
            PatientDisplayName = request.PatientDisplayName,
            DossierType = request.DossierType,
            RendezVous = request.RendezVous,
            Cycles = request.Cycles,
            Actes = request.Actes
        });

        return Ok(new SummarizePatientResponse { Summary = summary });
    }
}

public class SuggestRdvMotifRequest
{
    public int? PatientId { get; set; }
    public string? PatientDisplayName { get; set; }
    public DateTime? DateHeure { get; set; }
    public string? CurrentMotif { get; set; }
}

public class SuggestRdvMotifResponse
{
    public IReadOnlyList<string> Suggestions { get; set; } = [];
}

public class ReformulateNoteRequest
{
    public string Note { get; set; } = "";
}

public class ReformulateNoteResponse
{
    public string ReformulatedNote { get; set; } = "";
}

public class SummarizePatientRequest
{
    public string? PatientDisplayName { get; set; }
    public string? DossierType { get; set; }
    public List<TimelineRendezVousItem> RendezVous { get; set; } = [];
    public List<TimelineCycleItem> Cycles { get; set; } = [];
    public List<TimelineActeItem> Actes { get; set; } = [];
}

public class SummarizePatientResponse
{
    public string Summary { get; set; } = "";
}
