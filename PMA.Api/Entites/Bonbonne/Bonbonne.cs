using System.Collections.Generic;

namespace PMA.Api.Entites;

public class Bonbonne
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Couleur { get; set; } = string.Empty;
    public string TypeStockage { get; set; } = string.Empty;
    public string Temperature { get; set; } = string.Empty;

    public ICollection<Canister> Canisters { get; set; } = new List<Canister>();
}
