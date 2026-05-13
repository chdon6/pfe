namespace PMA.Api.Interfaces;

public interface IAiAssistantService
{
    IReadOnlyList<string> SuggestRendezVousMotifs(string? patientDisplayName, DateTime? dateHeure, string? currentMotif);
    string ReformulateAdministrativeNote(string note);
    string SummarizePatientTimeline(PatientTimelineContext context);
}

public class PatientTimelineContext
{
    public string? PatientDisplayName { get; set; }
    public string? DossierType { get; set; }
    public IReadOnlyList<TimelineRendezVousItem> RendezVous { get; set; } = [];
    public IReadOnlyList<TimelineCycleItem> Cycles { get; set; } = [];
    public IReadOnlyList<TimelineActeItem> Actes { get; set; } = [];
}

public class TimelineRendezVousItem
{
    public DateTime DateHeure { get; set; }
    public string? Motif { get; set; }
    public string? Statut { get; set; }
}

public class TimelineCycleItem
{
    public DateTime? DateDebut { get; set; }
    public string? Phase { get; set; }
    public string? EtapeCourante { get; set; }
    public string? StatutCycle { get; set; }
}

public class TimelineActeItem
{
    public string? Libelle { get; set; }
    public string? TypeActe { get; set; }
    public string? StatutRealisation { get; set; }
}
