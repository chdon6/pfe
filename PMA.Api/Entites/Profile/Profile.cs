using System.Collections.Generic;
using PMA.Api.Entites;

namespace PMA.Api.Entites;

public class Profile
{
    public int Id { get; set; }
    public string Libelle { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
}
