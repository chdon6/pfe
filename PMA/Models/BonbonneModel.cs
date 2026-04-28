using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class BonbonneModel
{
    public int Id { get; set; }

    [StringLength(100, ErrorMessage = "Le type de stockage ne doit pas depasser 100 caracteres.")]
    public string TypeStockage { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "La temperature ne doit pas depasser 50 caracteres.")]
    public string Temperature { get; set; } = string.Empty;
}

