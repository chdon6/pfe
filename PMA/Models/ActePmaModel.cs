using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class ActePmaModel
{
    public int Id { get; set; }

    [StringLength(50)]
    public string TypeActe { get; set; } = "autre";

    [StringLength(200, ErrorMessage = "Le libelle ne doit pas depasser 200 caracteres.")]
    public string Libelle { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "L'observation ne doit pas depasser 2000 caracteres.")]
    public string? Observation { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le patient doit etre valide.")]
    public int PatientId { get; set; }

    [StringLength(30)]
    public string StatutRealisation { get; set; } = "a_realiser";
}

