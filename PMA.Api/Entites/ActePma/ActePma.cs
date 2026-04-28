using System.Collections.Generic;
using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class ActePma
{
    public int Id { get; set; }
    public string TypeActe { get; set; } = "autre";
    public string Libelle { get; set; } = string.Empty;
    public string? Observation { get; set; }
    public string StatutRealisation { get; set; } = "a_realiser";

    public int PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public ICollection<RealisationActe> Realisations { get; set; } = new List<RealisationActe>();
}
