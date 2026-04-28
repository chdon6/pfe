using System.Collections.Generic;
using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class Canister
{
    public int Id { get; set; }
    public int Numero { get; set; }

    public int BonbonneId { get; set; }
    public Bonbonne Bonbonne { get; set; } = null!;

    public ICollection<PailleTube> PailleTubes { get; set; } = new List<PailleTube>();
}
