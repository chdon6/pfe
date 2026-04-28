using System;

namespace PMA.Api.Entites;

public class RendezVous
{
    public int Id { get; set; }
    public DateTime DateHeure { get; set; }
    public string Motif { get; set; } = string.Empty;
    public string Statut { get; set; } = "planifie";

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
}
