require 'grape'

class StarSystemApi < Grape::API

  desc 'Allow creation of a Star System'
  params do
  
    requires :name, type: String, desc: 'Name of the Star System'
    requires :status, type: String, desc: 'Status of a star system (complete/incomplete)'
    requires :student_journey_id, type: Integer, desc: 'Journey ID'

  end

  post '/starsystem' do
    starsystem_parameters = ActionController::Parameters.new(params)
      .permit(
        :name,
        :status,
        :student_journey_id
      )

    # Auth...

    result = StarSystem.create!(starsystem_parameters)

    present result, with: Entities::StarSystemEntity
  end

  desc 'Allow updating of a Star System'
  params do
    optional :name, type: String, desc: 'Name of the Star System'
    optional :status, type: String, desc: 'Status of a star system'
    requires :student_journey_id, type: Integer, desc: 'Journey ID'

  end
  put '/starsystem/:id' do
    starsystem_parameters = ActionController::Parameters.new(params)
      .permit(
        :name,
        :status,
        :student_journey_id
      )

    # Auth

    result = StartSystem.find(params[:id])
    result.update! starsystem_parameters

    present result, with: Entities::StarSystemEntity
  end

  desc 'Delete the star system with the indicated id'
  params do
    requires :id, type: Integer, desc: 'The id of the system to delete'
  end
  delete '/starsystem/:id' do
    StarSystem.find(params[:id]).destroy!
    true
  end

  desc 'Get all star systems with the indicated journey_id'
  params do
    requires :student_journey_id, type: Integer, desc: 'The id of the student_journey'
  end
  get '/starsystem' do
    result = StarSystem.where(student_journey_id: params[:student_journey_id])

    present result, with: Entities::StarSystemEntity
  end

  desc 'Get all stars with the indicated star_system_id'
  params do
    requires :id, type: Integer, desc: 'The id of the star_system'
  end
  get '/starsystem/stars/:id' do
    result = Star.where(star_system_id: params[:id])

    present result, with: Entities::StarsEntity
  end

  desc 'Get all planets with the indicated star_system_id'
  params do
    requires :id, type: Integer, desc: 'The id of the star_system'
  end
  get '/starsystem/planets/:id' do
    result = Planet.where(star_system_id: params[:id])

    present result, with: Entities::PlanetsEntity
  end
end