using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class ConsentementModel
{
    public int Id { get; set; }

    [StringLength(100, ErrorMessage = "Le type ne doit pas depasser 100 caracteres.")]
    public string Type { get; set; } = string.Empty;

    [NotDefaultDateTime]
    public DateTime DateSignature { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le patient doit etre valide.")]
    public int PatientId { get; set; }

    [StringLength(500)]
    public string? PhotoPath { get; set; }

    [StringLength(500)]
    public string? CinHommePath { get; set; }

    [StringLength(500)]
    public string? CinFemmePath { get; set; }

    [StringLength(500)]
    public string? ContratMariagePath { get; set; }
}

