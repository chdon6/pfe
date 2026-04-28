using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

public class PailleTubeModel
{
    public int Id { get; set; }

    [StringLength(100, ErrorMessage = "Le code barre ne doit pas depasser 100 caracteres.")]
    public string CodeBarre { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Le type de contenu ne doit pas depasser 50 caracteres.")]
    public string TypeContenu { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Le cycle PMA doit etre valide.")]
    public int CyclePmaId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le canister doit etre valide.")]
    public int CanisterId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La position doit etre positive.")]
    public int Position { get; set; }
}

