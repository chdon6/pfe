using System.Collections.Generic;

namespace PMA.Entites;

public class User
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Identifiant { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;

    public int? ProfileId { get; set; }
    public Profile? Profile { get; set; }

    public ICollection<RealisationActe> RealisationsActes { get; set; } = new List<RealisationActe>();
}
