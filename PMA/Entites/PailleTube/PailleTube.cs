namespace PMA.Entites;

public class PailleTube
{
    public int Id { get; set; }
    public string CodeBarre { get; set; } = string.Empty;
    public string TypeContenu { get; set; } = string.Empty; // Sperme, Ovocyte, Embryon

    public int CyclePmaId { get; set; }
    public CyclePma CyclePma { get; set; } = null!;

    public int CanisterId { get; set; }
    public Canister Canister { get; set; } = null!;

    public int Position { get; set; }
}
