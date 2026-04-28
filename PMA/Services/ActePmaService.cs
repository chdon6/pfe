using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class ActePmaService
{
    private readonly IUnitOfWork _unitOfWork;

    public ActePmaService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ActePmaModel>> ListAsync()
    {
        var entities = await _unitOfWork.ActesPma.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<ActePmaModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.ActesPma.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(ActePmaModel model)
    {
        var type = string.IsNullOrWhiteSpace(model.TypeActe) ? "autre" : model.TypeActe.Trim().ToLowerInvariant();
        var libelle = string.IsNullOrWhiteSpace(model.Libelle)
            ? ActePmaCatalog.LibelleDefaut(type)
            : model.Libelle;
        var entity = new ActePma
        {
            TypeActe = type,
            Libelle = libelle,
            Observation = model.Observation,
            StatutRealisation = string.IsNullOrWhiteSpace(model.StatutRealisation)
                ? "a_realiser"
                : model.StatutRealisation.Trim().ToLowerInvariant(),
            PatientId = model.PatientId
        };

        await _unitOfWork.ActesPma.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.ActesPma.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.ActesPma.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static ActePmaModel MapToModel(ActePma a)
    {
        return new ActePmaModel
        {
            Id = a.Id,
            TypeActe = string.IsNullOrEmpty(a.TypeActe) ? "autre" : a.TypeActe,
            Libelle = a.Libelle,
            Observation = a.Observation,
            StatutRealisation = string.IsNullOrEmpty(a.StatutRealisation) ? "a_realiser" : a.StatutRealisation,
            PatientId = a.PatientId
        };
    }
}

