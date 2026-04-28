using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class ProfileService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProfileService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ProfileModel>> ListAsync()
    {
        var entities = await _unitOfWork.Profiles.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<ProfileModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Profiles.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(ProfileModel model)
    {
        var entity = new Profile
        {
            Libelle = model.Libelle
        };

        await _unitOfWork.Profiles.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Profiles.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Profiles.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static ProfileModel MapToModel(Profile p)
    {
        return new ProfileModel
        {
            Id = p.Id,
            Libelle = p.Libelle
        };
    }
}

