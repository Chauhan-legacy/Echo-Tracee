"""
ECHO//TRACE Python Lab - Validation Report Printer
Generates and displays formatted summary of accuracy against ground truth.
"""

from rich.console import Console
from validate import run_validation

console = Console()

def main():
    console.print("\n[bold cyan]══════════════════════════════════════════════════════════════════[/bold cyan]")
    console.print("[bold cyan]   ECHO//TRACE — Embarko Student Challenge Forensic Lab Report    [/bold cyan]")
    console.print("[bold cyan]══════════════════════════════════════════════════════════════════[/bold cyan]\n")
    success = run_validation()
    if success:
        console.print("\n[bold green]✓ Gate I (Analytical DSP Validation): PASSED[/bold green]\n")
    else:
        console.print("\n[bold red]✗ Gate I (Analytical DSP Validation): FAILED[/bold red]\n")

if __name__ == "__main__":
    main()
