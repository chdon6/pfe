using System;

namespace PMA.Api.Entites;

public class RealisationActe
{
    public int Id { get; set; }
    public DateTime DateRealisation { get; set; }
    public string Resultat { get; set; } = string.Empty;
    public string? Observation { get; set; }
    public string Statut { get; set; } = string.Empty;

    public int ActePmaId { get; set; }
    public ActePma ActePma { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
