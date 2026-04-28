using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class UserService
{
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<UserModel>> ListAsync()
    {
        var entities = await _unitOfWork.Users.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<UserModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Users.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(UserModel model)
    {
        var entity = new User
        {
            Nom = model.Nom,
            Prenom = model.Prenom,
            Identifiant = model.Identifiant,
            PasswordHash = "RESET_REQUIRED",
            Telephone = model.Telephone,
            ProfileId = model.ProfileId
        };

        await _unitOfWork.Users.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Users.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Users.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static UserModel MapToModel(User u)
    {
        return new UserModel
        {
            Id = u.Id,
            Nom = u.Nom,
            Prenom = u.Prenom,
            Identifiant = u.Identifiant,
            Telephone = u.Telephone,
            ProfileId = u.ProfileId
        };
    }
}

