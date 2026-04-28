using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class UserModel
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Le nom est obligatoire.")]
    [StringLength(100, ErrorMessage = "Le nom ne doit pas depasser 100 caracteres.")]
    public string Nom { get; set; } = string.Empty;

    [Required(ErrorMessage = "Le prenom est obligatoire.")]
    [StringLength(100, ErrorMessage = "Le prenom ne doit pas depasser 100 caracteres.")]
    public string Prenom { get; set; } = string.Empty;

    [Required(ErrorMessage = "L'identifiant est obligatoire.")]
    [StringLength(100, ErrorMessage = "L'identifiant ne doit pas depasser 100 caracteres.")]
    public string Identifiant { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Le telephone ne doit pas depasser 50 caracteres.")]
    public string Telephone { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Le profil doit etre valide.")]
    public int? ProfileId { get; set; }
}

