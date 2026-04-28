using PMA.Api.Entites;
using PMA.Api.Interfaces;

namespace PMA.Api.Repositories;

public class UnitOfWork(PmaDbContext context) : IUnitOfWork
{
    private IRepository<Patient>? _patients;
    private IRepository<User>? _users;
    private IRepository<Profile>? _profiles;
    private IRepository<RendezVous>? _rendezVous;
    private IRepository<Consentement>? _consentements;
    private IRepository<ActePma>? _actesPma;
    private IRepository<ElementBiologique>? _elementsBiologiques;
    private IRepository<RealisationActe>? _realisationsActes;
    private IRepository<Protocole>? _protocoles;
    private IRepository<CyclePma>? _cyclesPma;
    private IRepository<PailleTube>? _pailleTubes;
    private IRepository<Canister>? _canisters;
    private IRepository<Bonbonne>? _bonbonnes;
    private IRepository<CycleEtapeHistorique>? _cycleEtapesHistorique;

    public IRepository<Patient> Patients => _patients ??= new Repository<Patient>(context);
    public IRepository<User> Users => _users ??= new Repository<User>(context);
    public IRepository<Profile> Profiles => _profiles ??= new Repository<Profile>(context);
    public IRepository<RendezVous> RendezVous => _rendezVous ??= new Repository<RendezVous>(context);
    public IRepository<Consentement> Consentements => _consentements ??= new Repository<Consentement>(context);
    public IRepository<ActePma> ActesPma => _actesPma ??= new Repository<ActePma>(context);
    public IRepository<ElementBiologique> ElementsBiologiques => _elementsBiologiques ??= new Repository<ElementBiologique>(context);
    public IRepository<RealisationActe> RealisationsActes => _realisationsActes ??= new Repository<RealisationActe>(context);
    public IRepository<Protocole> Protocoles => _protocoles ??= new Repository<Protocole>(context);
    public IRepository<CyclePma> CyclesPma => _cyclesPma ??= new Repository<CyclePma>(context);
    public IRepository<PailleTube> PailleTubes => _pailleTubes ??= new Repository<PailleTube>(context);
    public IRepository<Canister> Canisters => _canisters ??= new Repository<Canister>(context);
    public IRepository<Bonbonne> Bonbonnes => _bonbonnes ??= new Repository<Bonbonne>(context);
    public IRepository<CycleEtapeHistorique> CycleEtapesHistorique => _cycleEtapesHistorique ??= new Repository<CycleEtapeHistorique>(context);

    public Task<int> SaveChangesAsync() => context.SaveChangesAsync();

    public void Dispose() => context.Dispose();
}
