using PMA.Entites;
using PMA.Interfaces;
using PMA.Models;

namespace PMA.Services;

public class PatientService : IPatientService
{
    private readonly IUnitOfWork _unitOfWork;

    public PatientService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<PatientModel>> ListAsync()
    {
        var entities = await _unitOfWork.Patients.ListAsync();
        return entities.Select(MapToModel).ToList();
    }

    public async Task<PatientModel?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Patients.GetByIdAsync(id);
        return entity is null ? null : MapToModel(entity);
    }

    public async Task<int> CreateAsync(PatientCreateModel model)
    {
        var td = string.IsNullOrWhiteSpace(model.TypeDossier) ? "couple" : model.TypeDossier.Trim().ToLowerInvariant();
        var entity = new Patient
        {
            Nom = model.Nom,
            Prenom = model.Prenom,
            DateNaissance = model.DateNaissance,
            NumDossier = model.NumDossier,
            TypeDossier = td,
            TypeActePma = string.IsNullOrWhiteSpace(model.TypeActePma)
                ? null
                : model.TypeActePma.Trim().ToLowerInvariant(),
            Telephone = string.IsNullOrWhiteSpace(model.Telephone) ? null : model.Telephone.Trim(),
            FemmeNom = td == "couple" ? model.FemmeNom : null,
            FemmePrenom = td == "couple" ? model.FemmePrenom : null,
            FemmeDateNaissance = td == "couple" ? model.FemmeDateNaissance : null
        };

        await _unitOfWork.Patients.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(PatientModel model)
    {
        var entity = await _unitOfWork.Patients.GetByIdAsync(model.Id);
        if (entity is null)
            return false;

        entity.Nom = model.Nom;
        entity.Prenom = model.Prenom;
        entity.DateNaissance = model.DateNaissance;
        entity.NumDossier = model.NumDossier;
        entity.TypeActePma = string.IsNullOrWhiteSpace(model.TypeActePma)
            ? null
            : model.TypeActePma.Trim().ToLowerInvariant();
        entity.Telephone = string.IsNullOrWhiteSpace(model.Telephone) ? null : model.Telephone.Trim();
        if (!string.IsNullOrWhiteSpace(model.TypeDossier))
        {
            var td = model.TypeDossier.Trim().ToLowerInvariant();
            entity.TypeDossier = td;
            if (td != "couple")
            {
                entity.FemmeNom = null;
                entity.FemmePrenom = null;
                entity.FemmeDateNaissance = null;
            }
            else
            {
                entity.FemmeNom = model.FemmeNom;
                entity.FemmePrenom = model.FemmePrenom;
                entity.FemmeDateNaissance = model.FemmeDateNaissance;
            }
        }
        else if (entity.TypeDossier == "couple")
        {
            entity.FemmeNom = model.FemmeNom;
            entity.FemmePrenom = model.FemmePrenom;
            entity.FemmeDateNaissance = model.FemmeDateNaissance;
        }

        await _unitOfWork.Patients.UpdateAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.Patients.GetByIdAsync(id);
        if (entity is null)
            return false;

        await _unitOfWork.Patients.DeleteAsync(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static PatientModel MapToModel(Patient p)
    {
        return new PatientModel
        {
            Id = p.Id,
            Nom = p.Nom,
            Prenom = p.Prenom,
            DateNaissance = p.DateNaissance,
            NumDossier = p.NumDossier,
            TypeDossier = string.IsNullOrEmpty(p.TypeDossier) ? "couple" : p.TypeDossier,
            TypeActePma = p.TypeActePma,
            Telephone = p.Telephone,
            FemmeNom = p.FemmeNom,
            FemmePrenom = p.FemmePrenom,
            FemmeDateNaissance = p.FemmeDateNaissance
        };
    }
}

