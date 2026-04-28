using System;
using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class CycleEtapeHistorique
{
    public int Id { get; set; }
    public string Etape { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;
    public DateTime DateEtape { get; set; }
    public string? Observation { get; set; }

    public int CyclePmaId { get; set; }
    public CyclePma CyclePma { get; set; } = null!;

    public int? UserId { get; set; }
    public User? User { get; set; }
}
