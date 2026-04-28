using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class RealisationActeModel
{
    public int Id { get; set; }

    [NotDefaultDateTime]
    public DateTime DateRealisation { get; set; }

    [StringLength(500, ErrorMessage = "Le resultat ne doit pas depasser 500 caracteres.")]
    public string Resultat { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "L'observation ne doit pas depasser 2000 caracteres.")]
    public string? Observation { get; set; }

    [StringLength(50, ErrorMessage = "Le statut ne doit pas depasser 50 caracteres.")]
    public string Statut { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "L'acte PMA doit etre valide.")]
    public int ActePmaId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "L'utilisateur doit etre valide.")]
    public int UserId { get; set; }
}

