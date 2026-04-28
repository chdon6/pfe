using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class ProfileModel
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Le libelle est obligatoire.")]
    [StringLength(100, ErrorMessage = "Le libelle ne doit pas depasser 100 caracteres.")]
    public string Libelle { get; set; } = string.Empty;
}

