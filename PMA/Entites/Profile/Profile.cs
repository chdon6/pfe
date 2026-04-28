using System.Collections.Generic;

namespace PMA.Entites;

public class Profile
{
    public int Id { get; set; }
    public string Libelle { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
}
