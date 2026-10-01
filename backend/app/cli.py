import click

from app import create_app, db
from app.models.role import Role
from app.models.user import User


@click.group()
def cli():
    pass


@cli.command()
@click.option(
    "--username",
    prompt=True,
    help="Admin username",
)
@click.option(
    "--email",
    prompt=True,
    help="Admin email",
)
@click.option(
    "--password",
    prompt=True,
    hide_input=True,
    confirmation_prompt=True,
    help="Admin password",
)
@click.option(
    "--full-name",
    prompt=True,
    help="Admin full name",
)
def create_admin(
    username,
    email,
    password,
    full_name,
):
    """Create the first admin user."""
    app = create_app()

    with app.app_context():
        admin_role = (
            Role.query
            .filter_by(name="Admin")
            .first()
        )

        if not admin_role:
            click.echo(
                "Error: Admin role does not exist. "
                "Please run the seed migration first."
            )
            return

        if User.query.filter_by(
            username=username
        ).first():
            click.echo(
                "Error: Username already exists"
            )
            return

        if User.query.filter_by(
            email=email
        ).first():
            click.echo(
                "Error: Email already exists"
            )
            return

        admin = User(
            username=username,
            email=email,
            full_name=full_name,
            role_id=admin_role.id,
            station_id=None,
        )

        admin.set_password(password)

        db.session.add(admin)
        db.session.commit()

        click.echo(
            f"Admin user created successfully: {username}"
        )


if __name__ == "__main__":
    cli()