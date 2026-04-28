using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class RendezVousModel
{
    public int Id { get; set; }

    [NotDefaultDateTime]
    public DateTime DateHeure { get; set; }

    [StringLength(500, ErrorMessage = "Le motif ne doit pas depasser 500 caracteres.")]
    public string Motif { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Le patient doit etre valide.")]
    public int PatientId { get; set; }
}

