using PMA.Api.Entites;

namespace PMA.Api.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<Patient> Patients { get; }
    IRepository<User> Users { get; }
    IRepository<Profile> Profiles { get; }
    IRepository<RendezVous> RendezVous { get; }
    IRepository<Consentement> Consentements { get; }
    IRepository<ActePma> ActesPma { get; }
    IRepository<ElementBiologique> ElementsBiologiques { get; }
    IRepository<RealisationActe> RealisationsActes { get; }
    IRepository<Protocole> Protocoles { get; }
    IRepository<CyclePma> CyclesPma { get; }
    IRepository<PailleTube> PailleTubes { get; }
    IRepository<Canister> Canisters { get; }
    IRepository<Bonbonne> Bonbonnes { get; }
    IRepository<CycleEtapeHistorique> CycleEtapesHistorique { get; }
    IRepository<CapteurTemperature> CapteursTemperature { get; }
    IRepository<HistoriqueTemperature> HistoriquesTemperature { get; }
    IRepository<NiveauAzote> NiveauxAzote { get; }
    IRepository<MaintenancePreventive> MaintenancesPreventives { get; }
    IRepository<AlerteCryo> AlertesCryo { get; }

    Task<int> SaveChangesAsync();
}
