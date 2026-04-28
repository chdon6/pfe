using System.ComponentModel.DataAnnotations;

namespace PMA.Models;

[AttributeUsage(AttributeTargets.Property)]
public sealed class NotDefaultDateTimeAttribute : ValidationAttribute
{
    public NotDefaultDateTimeAttribute()
    {
        ErrorMessage = "La date est obligatoire.";
    }

    public override bool IsValid(object? value)
    {
        return value is DateTime dateTime && dateTime != default;
    }
}

