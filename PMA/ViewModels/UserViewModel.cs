using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Threading.Tasks;
using System.Runtime.CompilerServices;
using PMA.Commands;
using PMA.Models;
using PMA.Services;

namespace PMA.ViewModels;

public class UserViewModel : INotifyPropertyChanged
{
    private readonly UserService _userService;

    public ObservableCollection<UserModel> Users { get; } = new();

    private UserModel? _selectedUser;
    public UserModel? SelectedUser
    {
        get => _selectedUser;
        set => SetProperty(ref _selectedUser, value);
    }

    private bool _isBusy;
    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
    }

    private string? _errorMessage;
    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public UserModel NewUser { get; } = new();

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand CreateCommand { get; }
    public AsyncRelayCommand DeleteCommand { get; }

    public UserViewModel(UserService userService)
    {
        _userService = userService;

        RefreshCommand = new AsyncRelayCommand(LoadUsersAsync, () => !IsBusy);
        CreateCommand = new AsyncRelayCommand(CreateUserAsync, () => !IsBusy);
        DeleteCommand = new AsyncRelayCommand(DeleteSelectedAsync, () => !IsBusy && SelectedUser is not null);
    }

    public async Task LoadAsync() => await LoadUsersAsync();

    private async Task LoadUsersAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var items = await _userService.ListAsync();

            Users.Clear();
            foreach (var item in items)
                Users.Add(item);
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task CreateUserAsync()
    {
        try
        {
            IsBusy = true;
            ErrorMessage = null;

            var id = await _userService.CreateAsync(NewUser);
            SelectedUser = new UserModel
            {
                Id = id,
                Nom = NewUser.Nom,
                Prenom = NewUser.Prenom,
                Identifiant = NewUser.Identifiant,
                Telephone = NewUser.Telephone,
                ProfileId = NewUser.ProfileId
            };

            await LoadUsersAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task DeleteSelectedAsync()
    {
        if (SelectedUser is null)
            return;

        try
        {
            IsBusy = true;
            ErrorMessage = null;

            await _userService.DeleteAsync(SelectedUser.Id);
            SelectedUser = null;
            await LoadUsersAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void SetProperty<T>(ref T backingField, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(backingField, value))
            return;

        backingField = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

