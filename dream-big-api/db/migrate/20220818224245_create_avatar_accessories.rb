class CreateAvatarAccessories < ActiveRecord::Migration[7.0]
  def change
    create_table :avatar_accessories do |t|
      t.string :color
      t.string :shape
      t.string :texture
    end
  end
end
