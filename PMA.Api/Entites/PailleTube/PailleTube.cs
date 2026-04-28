using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class PailleTube
{
    public int Id { get; set; }
    public string CodeBarre { get; set; } = string.Empty;
    public string TypeContenu { get; set; } = string.Empty; // Sperme, Ovocyte, Embryon
    public string? CouleurVisotube { get; set; }

    public int? CyclePmaId { get; set; }
    public CyclePma? CyclePma { get; set; }

    public int? PatientId { get; set; }
    public Patient? Patient { get; set; }

    public int CanisterId { get; set; }
    public Canister Canister { get; set; } = null!;

    public int Position { get; set; }
}
