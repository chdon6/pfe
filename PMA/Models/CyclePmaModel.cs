using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class CyclePmaModel
{
    public int Id { get; set; }

    [StringLength(100, ErrorMessage = "La phase ne doit pas depasser 100 caracteres.")]
    public string Phase { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Le patient doit etre valide.")]
    public int PatientId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le protocole doit etre valide.")]
    public int? ProtocoleId { get; set; }
}

