using System;
using System.Threading.Tasks;
using PMA.Entites;
using PMA.Interfaces;

namespace PMA.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly PmaDbContext _context;

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

    public UnitOfWork(PmaDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public IRepository<Patient> Patients => _patients ??= new Repository<Patient>(_context);
    public IRepository<User> Users => _users ??= new Repository<User>(_context);
    public IRepository<Profile> Profiles => _profiles ??= new Repository<Profile>(_context);
    public IRepository<RendezVous> RendezVous => _rendezVous ??= new Repository<RendezVous>(_context);
    public IRepository<Consentement> Consentements => _consentements ??= new Repository<Consentement>(_context);
    public IRepository<ActePma> ActesPma => _actesPma ??= new Repository<ActePma>(_context);
    public IRepository<ElementBiologique> ElementsBiologiques => _elementsBiologiques ??= new Repository<ElementBiologique>(_context);
    public IRepository<RealisationActe> RealisationsActes => _realisationsActes ??= new Repository<RealisationActe>(_context);
    public IRepository<Protocole> Protocoles => _protocoles ??= new Repository<Protocole>(_context);
    public IRepository<CyclePma> CyclesPma => _cyclesPma ??= new Repository<CyclePma>(_context);
    public IRepository<PailleTube> PailleTubes => _pailleTubes ??= new Repository<PailleTube>(_context);
    public IRepository<Canister> Canisters => _canisters ??= new Repository<Canister>(_context);
    public IRepository<Bonbonne> Bonbonnes => _bonbonnes ??= new Repository<Bonbonne>(_context);

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public void Dispose() => _context.Dispose();
}

