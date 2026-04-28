using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class PatientModel
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Le nom est obligatoire.")]
    [StringLength(100, ErrorMessage = "Le nom ne doit pas depasser 100 caracteres.")]
    public string Nom { get; set; } = string.Empty;

    [Required(ErrorMessage = "Le prenom est obligatoire.")]
    [StringLength(100, ErrorMessage = "Le prenom ne doit pas depasser 100 caracteres.")]
    public string Prenom { get; set; } = string.Empty;

    [NotDefaultDateTime]
    public DateTime DateNaissance { get; set; }

    [Required(ErrorMessage = "Le numero de dossier est obligatoire.")]
    [StringLength(50, ErrorMessage = "Le numero de dossier ne doit pas depasser 50 caracteres.")]
    public string NumDossier { get; set; } = string.Empty;

    [StringLength(30)]
    public string TypeDossier { get; set; } = "couple";

    [StringLength(50)]
    public string? TypeActePma { get; set; }

    [StringLength(30)]
    public string? Telephone { get; set; }

    [StringLength(100)]
    public string? FemmeNom { get; set; }

    [StringLength(100)]
    public string? FemmePrenom { get; set; }

    public DateTime? FemmeDateNaissance { get; set; }
}

