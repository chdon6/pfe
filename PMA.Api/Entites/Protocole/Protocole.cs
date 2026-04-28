using System.Collections.Generic;

namespace PMA.Api.Entites;

public class Protocole
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty; // FIV, ICSI, etc.

    public ICollection<CyclePma> CyclesPma { get; set; } = new List<CyclePma>();
}
