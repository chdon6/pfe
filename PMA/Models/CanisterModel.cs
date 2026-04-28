using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class CanisterModel
{
    public int Id { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le numero doit etre positif.")]
    public int Numero { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La bonbonne doit etre valide.")]
    public int BonbonneId { get; set; }
}

