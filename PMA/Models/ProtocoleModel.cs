using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class ProtocoleModel
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Le type est obligatoire.")]
    [StringLength(50, ErrorMessage = "Le type ne doit pas depasser 50 caracteres.")]
    public string Type { get; set; } = string.Empty;
}

