using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class ElementBiologiqueModel
{
    public int Id { get; set; }

    [StringLength(50, ErrorMessage = "Le type d'element ne doit pas depasser 50 caracteres.")]
    public string TypeElement { get; set; } = string.Empty;

    [NotDefaultDateTime]
    public DateTime DateCreation { get; set; }

    [StringLength(50, ErrorMessage = "Le numero de tube ne doit pas depasser 50 caracteres.")]
    public string? NumeroTube { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le patient doit etre valide.")]
    public int PatientId { get; set; }
}

